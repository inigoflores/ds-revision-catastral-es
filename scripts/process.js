
var basePath = 'http://www1.sedecatastro.gob.es/portalcatastro/renova_municipiosUrb.aspx?';



var async = require('async');
var request = require('request');
var Converter = require("csvtojson").Converter;
var cheerio = require("cheerio");
var csvWriter = require('csv-write-stream')
var fs = require("fs");

var converter = new Converter({});
//var writer = csvWriter({ headers: ["municipio_id", "year"]})
var writer = csvWriter();

var output = [];



//end_parsed will be emitted once parsing finished
converter.on("end_parsed", function (municipios) {

  async.eachLimit(municipios.slice(3,9),2, retrieveValue, function(err){
    if (err) {
      console.log('A file failed to process ' + err);
    } else {
      console.log(output);
      writer.pipe(fs.createWriteStream('revision_catastral.csv'))

      //writer.write(['municipio_id', 'year']);

      output.forEach(function(row) {
        writer.write(row);
      });

      writer.end()
    }
  });

});


function retrieveValue (municipio, callback) {

  remotePath = basePath  + require('querystring').stringify({'provincia': municipio.loine_cp,'nMun':municipio.nombre});

  codigoIne = municipio.loine_cp + ("000" + municipio.loine_cm).slice(-3);


  (function(remotePath,codigoIne) {

    request(remotePath, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(body);

        resultado = $('td:nth-child(2) ').next().text();
        output.push({'municipio_id':codigoIne,'year':resultado});
        console.log({'municipio_id':codigoIne,'year':resultado});
        callback(null); //no error
      } else {
        callback(new Error("No file found at given url."), null);
      }
    });
  })(remotePath,codigoIne);





}

fs.createReadStream("../datapackages/ds-municipios-catastro-es/data/municipios_catastro.csv").pipe(converter);



/*Array.prototype.diff = function(a) {
  return this.filter(function(i) {return a.indexOf(i) < 0;});
};*/

//read from file
/*

function upload_file(file, callback) {
  // Do funky stuff with file
  callback();
}



queue.drain = function() {
  console.log("All lines read");
};

// Queue your files for upload
queue.push(files);

queue.concurrency = 20; // Increase to twenty simultaneous uploads

*/

/*

var lookup = {
  'JAN': '01',
  'FEB': '02',
  'MAR': '03',
  'APR': '04',
  'MAY': '05',
  'JUN': '06',
  'JUL': '07',
  'AUG': '08',
  'SEP': '09',
  'OCT': '10',
  'NOV': '11',
  'DEC': '12'
};

function process() {
  var skip = false;
  var outcsv = csv().to.path('data/cpi-uk-annual.csv');
  var outcsv2 = csv().to.path('data/cpi-uk-monthly.csv');
  csv()
    .from.path('cache/cpi-uk.csv')
    .on('record', function(data, idx) {
      if (idx == 0) {
        outcsv.write(['Year','Price Index']);
        outcsv2.write(['Date','Price Index']);
        return;
      } else if (!data[0] || skip) {
        skip = true;
        return;
      }
      var parts = data[0].split(' ');
      if (parts.length > 1) {
        data[0] = parts[0] + '-' + lookup[parts[1]] + '-01';
        outcsv2.write(data);
      } else {
        data[0] = parts[0];
        outcsv.write(data);
      }
    });
}

process();*/

