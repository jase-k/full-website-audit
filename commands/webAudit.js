import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import lighthouse  from 'lighthouse';
import chromeLauncher  from 'chrome-launcher';
import axios from 'axios'

import { resourceUsage }  from 'process';
import { resolve } from 'path';


export default async function webAudit({url, urlListPath }){
    if (!url && !urlListPath){
        console.log(chalk.red.bold("a url or urlListPath is required! specify url by -u or urlListPath by -ul"))
        return
    }

    let date = new Date()

    //Creates Unique Folder Name
    let folderPath = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDay()}(${date.getHours()}-${date.getMinutes()})audit`
    fs.mkdir(`data/${folderPath}/html/`, {recursive:true}, (err) => {
        if (err) throw err;
        console.log(chalk.green.bold(`directory data/${folderPath}/html/ successfully created`))    
        
        // Creating the Main Overview File
        let mainData = `URL Parsed, Final URL Inspected, Performance, SEO, Accessibility, Best Practices \n`
        fs.writeFileSync(`data/${folderPath}/results.csv`, mainData);
        console.log(chalk.green("Created main file at: " + folderPath + "results.csv"))
    })
    


    //Write List of Arrays to csv Document
    let urlArrayToAudit = []
    try{
        domainList = fs.readFileSync(urlListPath, {encoding: 'utf8'})
        urlArrayToAudit = domainList.split(",")
        console.log(chalk.green.bold("urlList.csv file found, will search these domains: " + domainList))
    }
    catch (e) {
        //Outputs what went wrong if user was trying to use a URL Path else outputs text confirming only a single url will be auditted
        if(urlListPath){
            console.log(e)
        }
        console.log(chalk.yellow.bold("No urlList.csv document found, will audit " + url + "only"))
    }

   
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
        const options = {output: 'html', onlyCategories: ['performance', 'seo', 'best-practices', 'accessibility'], port: chrome.port};

    
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
                let mainData = `${url}, ${runnerResult.lhr.finalURL}, ${performance.score * 100}, ${seo.score * 100}, ${accessibility.score * 100},  ${bestPractices.score * 100} \n`
// Adds Summary Details to main csv file                
                let CreateFiles = fs.createWriteStream(`data/${folderPath}/results.csv`, {flags:'a'})
                CreateFiles.write(mainData);
                resolve(idx + 1);
            })
            .catch(err => reject(err));
    })
}