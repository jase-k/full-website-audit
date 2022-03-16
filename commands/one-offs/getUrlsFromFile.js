import chalk from 'chalk';
import fs from 'fs';
import request from 'request';
let filePath = 'C:/Users/jkraft/Apps/learn-lulzbot-website/data/learn-local/content_entries/general_content.yml'

let content = fs.readFileSync(filePath, {encoding: 'utf8'})
// content = `nd:url('https://www.lulzbot.com/sites/default/files/Watch_over_transBG.png')
// no-repeat;background-size:100% auto; background-position-x:50%;background-repeat:
// no-repeat;} .lp-flexbox:hover > .hover_img img {opacity:0; transition: opacity
// .5s ease-in-out; -moz-transition: opacity .5s ease-in-out;-webkit-transition:
// opacity .5s ease-in-out;} .hover_img img {width:100%; opacity:1; transition:
// opacity .5s ease-in-out; -moz-transition: opacity .5s ease-in-out;-webkit-transition:
// opacity .5s ease-in-out;} .assembly {margin:2rem 0px ;display:flex;flex-direction:column;max-width:850px;}
// .assembly div {border-left: 4px solid #666;padding-left:15px;margin-bottom:1rem;}
// .assembly div:hover {border-left: 4px solid #c1d82f;} .assembly div:hover >
// h3 {color:#c1d82f;} .embed-container { position: relative; padding-bottom: 56.25%;
// height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe, .embed-container
// object, .embed-container embed { position: absolute; top: 0; left: 0; width:
// 100%; height: 100%; } </style><p>Ever need to make sure something on your 3D
// printer has actual continuity? Why not make yourself a continuity tester! This
// fully functional 3D Printed continuity tester is a great beginner project. Check
// out all of the details, step by step directions, <a href="https://www.hackster.io/LulzBotTeam/lulzbot-continuity-tester-e51af2"
// target='_blank'>download stl files and more at Hackster.io.</a></p><div style='max-width:750px;margin:2rem
// auto;'><div class='embed-container'>&lt;<div class='video-wrapper'><iframe width='560'
// height='315' src='https://www.youtube.com/embed/OwyizDs5BUI' title='YouTube
// video player' frameborder='0' allow='accelerometer; autoplay; clipboard-write;
// encrypted-media; gyroscope; picture-in-picture' allowfullscreen=''></iframe></div></div></div><div
// class='lp-flexbox'><div style='flex:3;'><h2>What You'll Need</h2><li><strong><a
// href='https://www.hackster.io/LulzBotTeam/lulzbot-continuity-tester-e51af2'
// target='_blank'>Visit Hackster.io for detailed instructions, materials, and
// files.</a></strong></li><li>LulzBot 3D Printer</li><li>Long nose plier</li><li>Lead
// free solder</li><li>Wire stripper/cutter</li><li>Continuity Tester .stl files
// part 1 and part 2</li><li>1x 3mm green LED</li><li>1x 47 ohm through hole resistor</li><li>1x
// Brass finishing nail</li><li>1x AA battery</li><li>1x AA Semicircle Battery
// +/- conversion spring 12mmx12mm</li><li>1x 20 AWG wire</li><li>4x M4 6mm button
// head screws</li></div><div style='flex:2;'><img src='https://www.lulzbot.com/sites/default/files/cover_2_(1)_pP9EgNALeU.jpg'></div></div><h2>Assembly</h2><div
// class='assembly'><div><h3>Step 1:</h3><p>Gather your materials and print out
// the casing with the provided STL's. We recommend a stronger filament like PETg`

// let regex = /src='.+?'/g
let regex = /('|")https:\/\/www\.lulzbot\.com\/sites\/default\/files\/[\s\S]+?('|"|\?)/g
let array = [ ...content.matchAll(regex)]
let commonview = array.map(url => url[0].substring(1, url[0].length-1))
let commonSet = new Set(commonview)
let commonArray = Array.from(commonSet)
let spaceArray = commonArray.filter(url => {
    if(url.match(' ')){
        return url
    }
})
// let textcsv = [...commonSet].join(',')
// fs.writeFileSync("./data/filelist.csv", textcsv)

// console.log(commonview)
console.log(commonSet)

function downloadAllImages(imageArray){
    fs.mkdirSync(`./yamlparse1/images`, {recursive:true})
    fs.mkdirSync(`./yamlparse1/errors`, {recursive:true})
    fs.writeFileSync(`./yamlparse1/errors/error1.csv`, `Error paths \n`)
    imageArray.forEach(imageUrl => {
        downloadImage(imageUrl)
    });
}

function downloadImage(imageUrl){
    console.log(imageUrl)
    let lastSlashRegex = /.+(\/.+)$/
    let imageName = imageUrl.match(lastSlashRegex)[1].substring(1)
    console.log(imageName)
    
    var download = function(uri, filename, callback){
      request.head(uri, function(err, res, body){
        if(err){
            console.log(err)
            fs.appendFileSync('./yamlparse1/errors/error1.csv', `${imageUrl} \n`)
            console.log(chalk.red.bold(`Error downloading... ${imageUrl}`))
        } else {
            let contentType = res.headers['content-type']
            console.log('content-type:', contentType);
            console.log('content-length:', res.headers['content-length']);
            if(!contentType.match(/.*html.*/)){
                request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
            } else {
                fs.appendFileSync('./yamlparse1/errors/error1.csv', `${imageUrl} \n`)
                console.log(chalk.red.bold(`Error downloading... ${imageUrl}`))
            }
            
        }
      });
    };
    
   download(imageUrl, `./yamlparse1/images/${imageName}`, function(){
        console.log('done');
    });
}

// downloadAllImages(commonArray)