import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import lighthouse  from 'lighthouse';
import chromeLauncher  from 'chrome-launcher';
import axios from 'axios'

import { resourceUsage }  from 'process';
import { resolve } from 'path';


export default async function webAudit({host, subdomainPath, levels=0, entrance }){
    if (!host){
        console.log(chalk.red.bold("host is required specify url by -h or --host"))
        return
    }
    if(!entrance){
        var url = host
        console.log(chalk.gray("no entrance url provided, using host url as starting url."))
    } else {
        url = entrance
    }

    let date = new Date()

    //Creates Unique Folder Name
    let folderPath = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDay()}(${date.getHours()}-${date.getMinutes()})`
    fs.mkdir(`data/${folderPath}/html/`, {recursive:true}, (err) => {
        if (err) throw err;
        console.log(chalk.green.bold(`directory data/${folderPath}/html/ successfully created`))    
        
        // Creating the Main Overview File
        let mainData = `URL Parsed, Final URL Inspected, Performance, SEO, Accessibility, Best Practices \n`
        fs.writeFileSync(`data/${folderPath}/results.csv`, mainData);
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
            console.log(`Details at: ./data/${folderPath}/html/${idx}.html`)
            chrome.kill().then(()=>{
                fs.writeFileSync(`data/${folderPath}/html/${idx}.html`, reportHtml);
                fs.writeFileSync(`data/${folderPath}/html/runnerResult.txt`, JSON.stringify(runnerResult));
                let mainData = `${url}, ${runnerResult.lhr.finalURL}, ${performance.score}, ${seo.score}, ${accessibility.score},  ${bestPractices.score} \n`
// Adds Summary Details to main csv file                
                let CreateFiles = fs.createWriteStream(`data/${folderPath}/results.csv`, {flags:'a'})
                CreateFiles.write(mainData);
                resolve(idx + 1);
            })
            .catch(err => reject(err));
    })
}


async function aggregateUrlsFromSite(url, host,  level=0){
    let urlsToAudit = new Set()
    urlsToAudit.add(url)
    let counter = 0
    //recursively search the rest of the site
    while(urlsToAudit.size > counter){
        let indexedUrlArray = Array.from(urlsToAudit)
        console.log(chalk.green(indexedUrlArray.length + " / "+ counter))
        if(indexedUrlArray[counter][0] == '/'){
            indexedUrlArray[counter] = host+indexedUrlArray[counter]
        }
        try{
            let html = await axios.get(indexedUrlArray[counter])
            addURLToSet(findURLS(html.data), host, urlsToAudit)
        }
        catch{
            console.log(chalk.red.bold("WARNING: Found URL: "+ indexedUrlArray[counter]+ " but find any data"))
        }
        counter++
    }
    return urlsToAudit
}

function removeHeader(htmlString){
    let regex = /<body/
    let bodyIndex = htmlString.search(regex)
    return htmlString.substring(bodyIndex)
}

function findURLS(htmlString){
    htmlString = removeHeader(htmlString)
    fs.writeFileSync('test/html.html', htmlString)
    let regex = /href=".+?"/g
    let array = [ ...htmlString.matchAll(regex)]
    fs.writeFileSync('test/array.txt', array.join(", "))
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