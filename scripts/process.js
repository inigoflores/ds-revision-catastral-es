var request = require('request');
var cheerio = require("cheerio");
var csvWriter = require('csv-write-stream');
var fs = require("fs");
var csv = require("fast-csv");
var async = require("async");
var semver = require("semver");
var ProgressBar = require('progress');
var dpinit = require('datapackage-init');


// Parametros

var baseURL = 'http://www1.sedecatastro.gob.es/portalcatastro/renova_municipiosUrb.aspx?';
var sourceFile = '../datapackages/ds-municipios-catastro-es/data/municipios_catastro.csv';
var destFile = '../data/revision_catastral.csv';

// Inicializamos archivo csv de salida

var writer = csvWriter();

var processedMunicipios = [];

// Inicializamos Barra de Progreso

var bar = new ProgressBar('  downloading [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: fs.readFileSync(sourceFile).toString().split("\n").length-2 // numero de municipios. Quitamos header y EOF
});


// Creamos cola y limitamos a 5 tareas concurrentes

var q = async.queue(scrape,5);


csv
    .fromPath(destFile,{objectMode: true,headers: true})
    .on("data", function(data){
        processedMunicipios.push(data);
    })
    .on("end", function(){

        writer.pipe(fs.createWriteStream(destFile));

        // procesamos listado de municipios y metemos tareas en la cola
        csv
            .fromPath(sourceFile,{objectMode: true,headers: true})
            .on("data", function(data){
                // Comprobamos si el municipio ya ha sido procesado. En caso contrario, lo metemos en la cola
                if (processedMunicipios.map(function(e) { return parseInt(e.municipio_id); }).indexOf(parseInt(data.ine_id)) < 0){
                    q.push(data);
                }
            })
            .on("end", function(){

                processedMunicipios.forEach(function (municipio) {
                    writer.write(municipio);
                })

                // Actualizamos/Creamos datapackage.json
                dpinit.init("../", function(err, datapackageJson){
                    //Actualizamos fecha y semver
                    var today = new Date();
                    datapackageJson.last_updated = today.getFullYear() + "-" + ("00" + (today.getMonth()+1)).slice(-2) + "-" + ("00" + today.getDate()).slice(-2);
                    datapackageJson.version = semver.inc(datapackageJson.version,'patch');

                    //Grbamos a disco
                    fs.writeFile("../datapackage.json", JSON.stringify(datapackageJson,null,2));
                });
            });
    });


/**
 *
 * @param municipio objeto con las propiedades encontradas en municipios_catastro.csv
 * @param next callback
 */
function scrape(municipio,next) {

    remotePath = baseURL  + require('querystring').stringify({'provincia': municipio.loine_cp,'nMun':municipio.nombre});

    (function(remotePath,municipio) {
        request(remotePath, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var $ = cheerio.load(body);
                year = $('tr:nth-child(2) > td:nth-child(3)').text();
                processedMunicipios.push({'municipio_id':municipio.loine_cp + ("000" + municipio.loine_cm).slice(-3),'nombre':municipio.nombre,'year':year});
            } else {
                console.log("No se puede descargar municipio: " + remotePath);
            }
        });
    })(remotePath,municipio);
    // Esperamos 300 ms
    setTimeout(function(){
        bar.tick();
        next()
        },300
    );
}