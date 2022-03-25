
var request = require('request');
var cheerio = require("cheerio");
var csvWriter = require('csv-write-stream');
var fs = require("fs");
var csv = require("fast-csv");
var async = require("async");
var semver = require("semver");
var ProgressBar = require('progress');
var dpinit = require('datapackage-init');

var writer = csvWriter({sendHeaders: false});
// Parametros

var BASEURL = 'http://www1.sedecatastro.gob.es/portalcatastro/renova_municipiosUrb.aspx?';
var SOURCEFILE = '../datapackages/ds-municipios-catastro-es/data/municipios_catastro.csv';
var DESTFILE = '../data/revision_catastral_' + new Date().getFullYear() + '.csv';

var processedMunicipios = [];
var allLinesProcessed = false; //Por si de vacía la cola antes de terminar de procesar todos los datos. Creo que no sucede

// Ajustamos parametros para evitar que salte el baneo por superar el limite de peticiones por segundo.
// Update 2021: Parece que salta siempre si hay más de ~7000 peticiones en una hora. Ejecutarlo en días diferentes o
// desde distintas IPs
var concurrency = 5;
var timeout = 500;

// Inicializamos Barra de Progreso

var totalSize = fs.readFileSync(SOURCEFILE).toString().split("\n").length;

if (fs.existsSync(DESTFILE)) {
  totalSize = totalSize - fs.readFileSync(DESTFILE).toString().split("\n").length;
}

var bar = new ProgressBar('  downloading [:bar] :percent :etas', {
  complete: '=',
  incomplete: ' ',
  width: 20,
  total: totalSize
});

// Inicializamos CSV de salida
writer.pipe(fs.createWriteStream(DESTFILE,{
      'flags': 'a', 'encoding': null, 'mode': 0666
}));

// Creamos cola y limitamos las tareas concurrentes
var q = async.queue(scrape, concurrency); //con esto se e

// Leemos el CSV de salida, por si ya existiera (p.e. operación previa interrumpida).
// TODO: Incluir la opción de borrarado del fichero, cuando queremos procesar un año nuevo
csv
  .fromPath(DESTFILE, {objectMode: true, headers: true})
  .on("data", function (data) {
    processedMunicipios.push(data);
  })
  .on("end", function () {
    //console.log(processedMunicipios.length);
    // creamos los cabeceros solo si el fichero no existe previamente
    if(processedMunicipios.length==0) {
      writer.write({'municipio_id':'municipio_id', 'nombre':'nombre', 'year':'year'});
    }
    //throw new Error("my error message");
    // procesamos listado de municipios y metemos tareas en la cola
    csv
      .fromPath(SOURCEFILE, {objectMode: true, headers: true})
      .on("data", function (data) {
        // Comprobamos si el municipio ya ha sido procesado. Solo entran en la cola los que no existen previamente en el CSV destino
        var notFound = processedMunicipios.map(function (e) {return parseInt(e.municipio_id)}).indexOf(parseInt(data.ine_id)) < 0;
        if (notFound) {
          q.push(data);
        }
      })
      .on("end", function () {
        allLinesProcessed = true;
      })
  });


/**
 *
 * @param municipio objeto con las propiedades encontradas en municipios_catastro.csv
 * @param next callback
 */
function scrape(municipio, next) {

  municipio.nombre = municipio.nombre.replace(/ +(?= )/g,''); //	L'ESPLUGA DE FRANCOLI tiene doble espacio.

  remotePath = BASEURL + require('querystring').stringify({
      'provincia': municipio.loine_cp,
      'nMun': municipio.nombre
    });

  (function (remotePath, municipio) {
    request(remotePath, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(body);
        year = $('tr:nth-child(2) > td:nth-child(3)').text();
        //Grabamos el dato del municipio al CSV destino
        writer.write({
          'municipio_id': municipio.loine_cp + ("000" + municipio.loine_cm).slice(-3),
          'nombre': municipio.nombre,
          'year': year
        });
      } else {
        console.log("No se puede descargar municipio: " + remotePath);
      }
    });
  })(remotePath, municipio);
  // Throttling
  setTimeout(function () {
      bar.tick();
      next()
    }, timeout
  );
}


// Callback que se invoca cuando se vacía la cola
q.drain(() =>  {
  if (q.length() === 0 && allLinesProcessed) {
    terminate();
  }
})


//  Grabamos CSV a disco y regeneramos datapackage.json
function terminate(){
  // Actualizamos/Creamos datapackage.json
  dpinit.init("../", function (err, datapackageJson) {
    //Actualizamos fecha y semver
    var today = new Date();
    datapackageJson.last_updated = today.getFullYear() + "-" + ("00" + (today.getMonth() + 1)).slice(-2) + "-" + ("00" + today.getDate()).slice(-2);
    datapackageJson.version = semver.inc(datapackageJson.version, 'patch');

    //Grbamos a disco
    fs.writeFile("../datapackage.json", JSON.stringify(datapackageJson, null, 2));

  });
}