//createfolder for images: 
//request image url
//save request into folder
import chalk from 'chalk';
import fs from 'fs';
import request from 'request';

let yamlContent = fs.readFileSync('./data/general_content.yml', {encoding: 'utf-8'})

var matches = yamlContent.match(/\bhttps?:\/\/www\.lulzbot\.com\/sites\/default\/files\S+(?=')/gi);
for(let i = 0; i < matches.length; i++){
    let index = matches[i].indexOf('?')
    if(index != -1){
        matches[i] = matches[i].substring(0, index)
    }
}

// console.log(matches)

let sample = 'helow?world'
let index = sample.indexOf('?')
if(index != -1){
    sample = sample.substring(0, index)
}
// console.log(sample)

// let imageUrl =     'https://www.lulzbot.com/sites/default/files/video_cta_640X200.mp4'

function downloadAllImages(imageArray){
    fs.mkdirSync(`./yamlparse/images`, {recursive:true})
    fs.mkdirSync(`./yamlparse/errors`, {recursive:true})
    fs.writeFileSync(`./yamlparse/errors/error1.csv`, `Error paths \n`)
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
            fs.appendFileSync('./yamlparse/errors/error1.csv', `${imageUrl} \n`)
            console.log(chalk.red.bold(`Error downloading... ${imageUrl}`))
        } else {
            let contentType = res.headers['content-type']
            console.log('content-type:', contentType);
            console.log('content-length:', res.headers['content-length']);
            if(!contentType.match(/.*html.*/)){
                request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
            } else {
                fs.appendFileSync('./yamlparse/errors/error1.csv', `${imageUrl} \n`)
                console.log(chalk.red.bold(`Error downloading... ${imageUrl}`))
            }
            
        }
      });
    };
    
   download(imageUrl, `./yamlparse/images/${imageName}`, function(){
        console.log('done');
    });
}


let allErrors = fs.readFileSync('./yamlparse/errors/error.csv', {encoding: 'utf-8'})
let urlErrorArray = allErrors.split('\n')
urlErrorArray.shift()
console.log(urlErrorArray)

downloadAllImages(urlErrorArray)



