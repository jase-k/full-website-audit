import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import lighthouse  from 'lighthouse';
import chromeLauncher  from 'chrome-launcher';
import axios from 'axios'

import { resourceUsage }  from 'process';
import { resolve } from 'path';
let host = 'https://www.lulzbot.com'


export default async function webAudit(url){
    let date = new Date()
    //Creates Unique Folder Name
    let folderPath = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDay()}(${date.getHours()}-${date.getMinutes()})`
    console.log(chalk.yellow.bold('Web Audit Tool is ready for Use!' + folderPath))
    console.log('creating folder for html results: ')
    fs.mkdir(`./${folderPath}`, {recursive:true}, (err) => {
        if (err) throw err;
        console.log(chalk.green.bold(`directory ./${folderPath} successfully created`))
    })


    console.log(chalk.yellow("Searching for URLS to parse: "))
    let urlSet = await aggregateUrlsFromSite('https://www.lulzbot.com/');

    console.log(chalk.red.bold(`You are about to audit ${urlSet.size} urls... continue?`))
    // to check the integrating of the urls generated
    // urlSet.forEach(url => {
    //     console.log(chalk.green(url))
    // })
    
    //converting urlSet into an Array to use a reducer on 
    let urlArrayToAudit = Array.from(urlSet)

    recursivePromise(urlArrayToAudit, folderPath)
};

function recursivePromise(urlArrayToAudit, folderPath, idx=0){
    if(urlArrayToAudit.length == idx){
        return
    }
        runLighthouse(urlArrayToAudit, idx, folderPath)
        .then(result => recursivePromise(urlArrayToAudit, folderPath, result))            
}

// Returns a promise of the next index after completion
async function runLighthouse(urlArray, idx, folderPath){
    console.log(chalk.green.bold(`Running ${idx+1} of ${urlArray.length}`));
    let url = urlArray[idx]
    return new Promise(async (resolve, reject) => {
        const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
        const options = {output: 'html', onlyCategories: ['performance'], port: chrome.port};
    
            if(url[0] == '/'){
                url = host+url
            }
    
            console.log("Auditing: ", url)
            const runnerResult = await lighthouse(url, options);
          
            // `.report` is the HTML report as a string
            const reportHtml = runnerResult.report;
            
            
            // `.lhr` is the Lighthouse Result as a JS object
            console.log('Report is done for', runnerResult.lhr.finalUrl);
            console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);
            console.log(`Details at: ./${folderPath}/${idx}.html`)
            chrome.kill().then(()=>{
                fs.writeFileSync(`${folderPath}/${idx}.html`, reportHtml);
                resolve(idx + 1);
            })
            .catch(err => reject(err));
    })
}


async function aggregateUrlsFromSite(url, level=0){
    let urlsToAudit = new Set()
    let html = await axios.get(url)
    addURLToSet(findURLS(html.data), host, urlsToAudit)
    // .then(html => {
    //     let htmlBody = removeHeader(html.data)
    //     let urlArray = findURLS(htmlBody)
    //     addURLToSet(urlArray)
    // })
    return urlsToAudit
}

function removeHeader(htmlString){
    let regex = /<body/
    let bodyIndex = htmlString.search(regex)
    return htmlString.substring(bodyIndex)
}

function findURLS(htmlString){
    htmlString = removeHeader(htmlString)
    let regex = /href=".+?"/g
    let array = [ ...htmlString.matchAll(regex)]
    return array
}

function addURLToSet(urlArray, host='lulzbot.com', urlSet){
    //remove href=" && "$
    let httpsRegex = /https:\/\//
    urlArray.forEach(url => {
        let finalURL = url[0].substring(6, url[0].length-1)
        if((finalURL.match(httpsRegex) && finalURL.match(host)) || finalURL[0] == "/"){
            urlSet.add(finalURL)
        } else{
        }
    })
}