import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import chromeLauncher  from 'chrome-launcher';
import CDP from 'chrome-remote-interface';
import { resolve } from 'path';



export default async function getUrls({host, subdomainPath='./validurls.txt', levels=0, entrance }){
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
    fs.mkdirSync(`data/${folderPath}/urlList/`, {recursive:true})
    console.log(chalk.green.bold(`directory data/${folderPath}/urlList/ successfully created`))    
    
    //Sets an array of domains that is wanted to add to the list of urls to fetch
    let validDomains = []
    validDomains.push(host)
    try{
        validDomains = fs.readFileSync('./validurls.txt', {encoding: 'utf8'})
        validDomains = validDomains.split(",")
        console.log(chalk.green.bold("validurls file found, will search these domains: " + validDomains))
    }
    catch (e) {
        console.log(chalk.red(e))
        console.log(chalk.yellow.bold("No validurls.txt document found, only getting a list of the provided host domain!"))
    }


    console.log(chalk.yellow("Searching for URLS to parse: "))
    
    checkForUrls(url, host, folderPath, validDomains)
    // let urlSet = await aggregateUrlsFromSite(url, host, folderPath, validDomains);

    
};

function checkForUrls(url, host, folderPath, validDomains, urlsToAudit= new Set().add(url), levels=0, counter=0){
    if(counter%10 == 0 ){
        fs.writeFileSync(`data/${folderPath}/urlList/urlList.csv`, Array.from(urlsToAudit).join(','))
        console.log(chalk.green.bold(`You found ${urlsToAudit.size} url/s saved in ./data/${folderPath}/urlList/urlList.csv`))
    }
    if(urlsToAudit.size < counter + 1){
        //Overwrite List of Arrays to csv Document
        fs.writeFileSync(`data/${folderPath}/urlList/urlList.csv`, Array.from(urlsToAudit).join(','))
        console.log(chalk.green.bold(`You found ${urlsToAudit.size} url/s saved in ./data/${folderPath}/urlList/urlList.csv`))

    } else {
        aggregateUrlsFromSite(url, host, folderPath, validDomains, urlsToAudit, levels, counter)
        .then((urlsToAudit)=> { 
            counter++
            checkForUrls(url, host, folderPath, validDomains, urlsToAudit, levels, counter)
        })    
    }
}



function aggregateUrlsFromSite(url, host, folderPath, validDomains, urlsToAudit= new Set().add(url), levels=0, counter=0){
    return new Promise(async (resolve, reject) => {
        // if(urlsToAudit.size < counter + 1){
        //     resolve(urlsToAudit)
        // }

        let urlArrayToAudit = Array.from(urlsToAudit)
        console.log(chalk.green("On URL " + counter + " of " + urlsToAudit.size));
        console.log("Searching " + urlArrayToAudit[counter])
        //Change log level to info and comment out chromeFlags for debugging
        const chrome = await chromeLauncher.launch({chromeFlags: ['--headless'], logLevel: 'silent' });
        const protocol = await CDP({port: chrome.port});
        
        // Extract the DevTools protocol domains we need and enable them.
        // See API docs: https://chromedevtools.github.io/devtools-protocol/
        const {Page, Runtime} = protocol;
        await Promise.all([Page.enable(), Runtime.enable()]);
        Page.navigate({url: urlArrayToAudit[counter]});
        // Wait for window.onload before doing stuff.
        Page.loadEventFired(async () => {
            const getHtml = "document.querySelector('html').outerHTML";
            const getOrigin = "window.location.origin";
            // Evaluate the JS expression in the page.
            const result = await Runtime.evaluate({expression: getHtml});
            const originResult = await Runtime.evaluate({expression: getOrigin});
            
            const htmlData = result.result.value
            fs.writeFileSync(`data/${folderPath}/urlList/test.html`, htmlData);
            //parse html
            let urlArray = parseUrlsFromHtml(htmlData)

            //add urls to urlsToAudit
            addURLToSet(urlArray, validDomains, urlsToAudit, originResult.result.value)


            protocol.close();
            chrome.kill().then(() => {
                console.log("Chrome is finished")
                //wait 0.5 second so chrome can run again without interferance
                setTimeout(() => {
                    // counter++
                    // aggregateUrlsFromSite(url, host, folderPath, validDomains, urlsToAudit, levels, counter)
                    resolve(urlsToAudit)
                }, 250)
            })
        })
    })
}

function removeHeader(htmlString){
    let regex = /<body/
    let bodyIndex = htmlString.search(regex)
    return htmlString.substring(bodyIndex)
}

function parseUrlsFromHtml(htmlString){
    htmlString = removeHeader(htmlString)
    let regex = /href=".+?"/g
    let array = [ ...htmlString.matchAll(regex)]
    return array
}

function addURLToSet(urlArray, validDomains, urlSet, host){
    //remove href=" && "$
    let httpsRegex = /https:\/\//
    var domainRegex = new RegExp(''+ validDomains.join('|') +'', 'i');
    urlArray.forEach(url => {
        let finalURL = url[0].substring(6, url[0].length-1)
        //if url contains # or ? chop that portion of the url off
        let chopOffPoint = finalURL.search(/\?|\#/)
        if(chopOffPoint != -1){
            console.log(chalk.blue("chopped: ", finalURL))
            finalURL = finalURL.substring(0, chopOffPoint)
            console.log(chalk.blue("to: ", finalURL))
        }
        if(isFile(finalURL)){
            //do nothing
        } else if((finalURL.match(httpsRegex) && finalURL.match(domainRegex))){
            // console.log(chalk.yellow("adding url to list for audit: ", finalURL ))
            urlSet.add(finalURL)
        } else if (finalURL[0] == "/"){
            finalURL = host + finalURL
            // console.log(chalk.yellow("adding url to list for audit: ", finalURL ))
            urlSet.add(finalURL)
        }
    })
}

function isFile(url){
    let splitUrl = url.split(".")
    let endOfUrl = splitUrl[splitUrl.length - 1]
    if(endOfUrl.length > 5 || endOfUrl.match(/com|org|io|edu|net|\//i)){
        return false
    }
    console.log(chalk.rgb(255,255,0)("skipping file: ", url))
    return true
}