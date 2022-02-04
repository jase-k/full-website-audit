import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import lighthouse  from 'lighthouse';
import chromeLauncher  from 'chrome-launcher';
import axios from 'axios'

import { resourceUsage }  from 'process';
import { resolve } from 'path';


export default async function webAudit({url}){
    if (!url){
        console.log(chalk.red.bold("url is required specify url by -u or --url"))
        return
    }
    
    let host = url //Could change this to an option later to allow for an entrance domain and a parent domain to accomodate subdomains

    let date = new Date()
    //Creates Unique Folder Name
    let folderPath = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDay()}(${date.getHours()}-${date.getMinutes()})`
    console.log(chalk.yellow.bold('Web Audit Tool is ready for Use!' + folderPath))
    console.log('creating folder for html results: ')
    fs.mkdir(`./${folderPath}/html/`, {recursive:true}, (err) => {
        if (err) throw err;
        console.log(chalk.green.bold(`directory ./${folderPath}/html/ successfully created`))
        
        // Creating the Main Overview File
        let mainData = `URL Parsed, Final URL Inspected, Performance, SEO, Accessibility, Best Practices \n`
        fs.writeFileSync(`${folderPath}/results.csv`, mainData);
        console.log(chalk.green("Created main file at: " + folderPath + "results.csv"))
    })


    console.log(chalk.yellow("Searching for URLS to parse: "))
    let urlSet = await aggregateUrlsFromSite(url, host);

    console.log(chalk.red.bold(`You are about to audit ${urlSet.size} urls... continue?`))
    // to check the integrating of the urls generated
    urlSet.forEach(url => {
        console.log(chalk.green(url))
    })
    
    //converting urlSet into an Array to use a reducer on 
    let urlArrayToAudit = Array.from(urlSet)
    
    // Comment this in to test with only one url
    runLighthouse(urlArrayToAudit, 0, folderPath, host)
    // recursivePromise(urlArrayToAudit, folderPath)
};

function recursivePromise(urlArrayToAudit, folderPath, idx=0){
    if(urlArrayToAudit.length == idx){
        return
    }
        runLighthouse(urlArrayToAudit, idx, folderPath)
        .then(result => recursivePromise(urlArrayToAudit, folderPath, result))            
}

// Returns a promise of the next index after completion
async function runLighthouse(urlArray, idx, folderPath, host){
    console.log(chalk.green.bold(`Running ${idx+1} of ${urlArray.length}`));
    let url = urlArray[idx]
    return new Promise(async (resolve, reject) => {
        const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
        const options = {output: 'html', onlyCategories: ['performance', 'seo', 'best-practices', 'accessibility'], port: chrome.port};
    
            if(url[0] == '/'){
                url = host+url
            }
    
            console.log("Auditing: ", url)
            const runnerResult = await lighthouse(url, options);
          
            // `.report` is the HTML report as a string
            const reportHtml = runnerResult.report;
            
            
            // `.lhr` is the Lighthouse Result as a JS object
            let { performance, seo, accessibility } = runnerResult.lhr.categories 
            let bestPractices = runnerResult.lhr.categories['best-practices'] 
            console.log('Report is done for', runnerResult.lhr.finalUrl);
            console.log('Performance score was', performance.score * 100);
            console.log('SEO score was', seo.score * 100);
            console.log('Best Practices score was', bestPractices.score * 100);
            console.log('Accessibility score was', accessibility.score * 100);
            console.log(`Details at: ./${folderPath}/html/${idx}.html`)
            chrome.kill().then(()=>{
                fs.writeFileSync(`${folderPath}/html/${idx}.html`, reportHtml);
                let mainData = `${url}, ${runnerResult.lhr.finalURL}, ${performance.score}, ${seo.score}, ${accessibility.score},  ${bestPractices.score} \n`
// Adds Summary Details to main csv file                
                let CreateFiles = fs.createWriteStream(`${folderPath}/results.csv`, {flags:'a'})
                CreateFiles.write(mainData);
                resolve(idx + 1);
            })
            .catch(err => reject(err));
    })
}


async function aggregateUrlsFromSite(url, host,  level=0){
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

function addURLToSet(urlArray, host, urlSet){
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