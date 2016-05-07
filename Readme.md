# ds-revision-catastral-es

Dataset que incluye un listado de municipios y su año de revisión catastral.
 


## Revisión Catastral 


- Fuente: [Consulta de las ponencias de valores. Sede Electrónica del Catastro](http://www.catastro.meh.es/esp/ponencia_valores.asp)
- Tipo: HTML 
- Datos procesados: [/data/revision_catastral.csv](data/revision_catastral.csv) 



### Formato de los datos


Incluye los siguientes campos:

        municipio_id:   Código INE del municipio
        nombre:         Denominación del municipio según MHAP
        year:           Año de la última ponencia de valores
       


Ejemplo en CSV:


| municipio_id | nombre           | year | 
|--------------|------------------|------| 
| 2001         | ABENGIBRE        | 1990 | 
| 2002         | ALATOZ           | 2012 | 
| 2003         | ALBACETE         | 2006 | 
| 2004         | ALBATANA         | 2007 | 
| 2005         | ALBOREA          | 2009 | 
| 2010         | ALPERA           | 2007 | 
| 2006         | ALCADOZO         | 1994 | 
| 2007         | ALCALA DEL JUCAR | 2012 | 
| 2009         | ALMANSA          | 1996 | 
| 2008         | ALCARAZ          | 2007 | 
| 2012         | BALAZOTE         | 1996 | 
| 2013         | BALSA DE VES     | 2007 | 
| 2011         | AYNA             | 1994 | 
| 2015         | BARRAX           | 1994 | 
| 2016         | BIENSERVIDA      | 1990 | 


## Script

El script se puede encontrar en [/scripts/](/scripts/).
