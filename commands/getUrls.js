/*
NOT FINALIZED: 

Use this function to scrape a website and list all urls in one csv file. The scraper currently operates by adding all urls found on a website to a 
Set and calling a get request from each url in the Set. 

KNOWN BUGS: 
Some webpages will have components load after specific user interaction with the page and this crawler would not catch those
Would like to have an option to output 404's and other statuses in a the csv
*/


import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import chromeLauncher  from 'chrome-launcher';
import CDP from 'chrome-remote-interface';
import { resolve } from 'path';



export default async function getUrls({host, subdomainPath='./validurls.txt', levels=0, entrance, redirects=true }){
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
    let folderPath = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}(${date.getHours()}-${date.getMinutes()})`
    fs.mkdirSync(`data/${folderPath}/urlList/`, {recursive:true})
    console.log(chalk.green.bold(`directory data/${folderPath}/urlList/ successfully created`))    
    fs.writeFileSync(`data/${folderPath}/urlList/redirects.csv`, '')
    console.log(chalk.green.bold(`redirect.csv successfully created (This will list any webpage that is redirected somewhere else. More details at redirect_map.csv)`))    
    fs.writeFileSync(`data/${folderPath}/urlList/redirect_map.csv`, 'Origin, Redirected to: \n')
    console.log(chalk.green.bold(`redirect_map.csv successfully created (This tells you where your urls are redirected to)`))    
    
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
        console.log(chalk.rgb(255,255,0).bold("No validurls.txt document found, only getting a list of the provided host domain!"))
    }


    console.log(chalk.rgb(255,255,0)("Searching for URLS to parse: "))
    
    checkForUrls(url, host, folderPath, validDomains)
    // let urlSet = await aggregateUrlsFromSite(url, host, folderPath, validDomains);
    
    function checkForUrls(url, host, folderPath, validDomains, urlsToAudit= new Set().add(url), levels=0, counter=0){
        if(counter%10 == 0 ){
            fs.writeFileSync(`data/${folderPath}/urlList/urlList.csv`, Array.from(urlsToAudit).join(','))
            console.log(chalk.green.bold(`Checkpoint Saved! ${urlsToAudit.size} url/s saved in ./data/${folderPath}/urlList/urlList.csv`))
        }
        if(urlsToAudit.size < counter + 1){
            //Overwrite List of Arrays to csv Document
            fs.writeFileSync(`data/${folderPath}/urlList/urlList.csv`, Array.from(urlsToAudit).join(','))
            console.log(chalk.green.bold(`Web Crawl Complete! You found ${urlsToAudit.size} url/s saved in ./data/${folderPath}/urlList/urlList.csv`))
    
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
            
            let urlArrayToAudit = Array.from(urlsToAudit)
            let urlToAudit = urlArrayToAudit[counter]
            console.log(chalk.green("On URL " + counter + " of " + urlsToAudit.size));
            if(!urlToAudit.match(new RegExp(''+ validDomains.join('|') +'', 'i'))){
                console.log(chalk.red("inValid URL " + urlToAudit))
                resolve(urlsToAudit)
            } else{
                console.log("Searching " + urlToAudit)

                //Change log level to info and comment out chromeFlags for debugging
                const chrome = await chromeLauncher.launch({chromeFlags: ['--headless'], logLevel: 'silent' });
                const protocol = await CDP({port: chrome.port});
                
                // Extract the DevTools protocol domains we need and enable them.
                // See API docs: https://chromedevtools.github.io/devtools-protocol/
                const {Page, Runtime} = protocol;
                await Promise.all([Page.enable(), Runtime.enable()]);
                Page.navigate({url: urlToAudit});
                // Wait for window.onload before doing stuff.
                Page.loadEventFired(async () => {
                    const getHtml = "document.querySelector('html').outerHTML";
                    const getOrigin = "window.location.origin";
                    const getPath = "window.location.pathname";
                    
                    // Evaluate the JS expression in the page.
                    const result = await Runtime.evaluate({expression: getHtml});
                    const originResult = await Runtime.evaluate({expression: getOrigin});
                    const pathResult = await Runtime.evaluate({expression: getPath});
                    const finalFullUrl = originResult.result.value + pathResult.result.value
        
                    if(isRedirect(urlToAudit, finalFullUrl)){
                        
                        let writeRedirects = fs.createWriteStream(`data/${folderPath}/urlList/redirects.csv`, {flags:'a'})
                        let writeRedirectMaps = fs.createWriteStream(`data/${folderPath}/urlList/redirect_map.csv`, {flags:'a'})
                        writeRedirects.write(`${urlToAudit},`);
                        writeRedirectMaps.write(`${urlToAudit}, ${finalFullUrl}, \n`);
        
                        if(!redirects){
                            urlsToAudit.delete(urlToAudit)
                            console.log(chalk.green.bold(`Removed url redirect: ${urlToAudit} from urlList.csv`))
                        }
    
                        urlsToAudit.add(finalFullUrl)
                        fs.writeFileSync(`data/${folderPath}/urlList/urlList.csv`, Array.from(urlsToAudit).join(','))
        
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
                    } else {
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
                    }
                })
            }
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
                finalURL = finalURL.substring(0, chopOffPoint)
            }
            if(isFile(finalURL) || finalURL == "" || onRedirectUrlList(host+finalURL) || onRedirectUrlList(finalURL)){
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
        if(url == ""){
            return false
        }
        let copyUrl = url 
        let splitUrl = copyUrl.split(".")
        let endOfUrl = splitUrl[splitUrl.length - 1]
        
    //if your website has another ending besides the ones listed below, adding it to the regex pattern will prevent any site getting untracked
        if(endOfUrl.match(/com|org|io|edu|net|\//i)){
            return false
        }
        return true
    }
    
    function isRedirect(originalUrl, finalUrl){
        if(originalUrl == finalUrl){
            return false
        } else {
            return true
        }
    }
    
    function onRedirectUrlList(url){
        let redirectedDomains = fs.readFileSync(`data/${folderPath}/urlList/redirects.csv`, {encoding: 'utf8'})
        redirectedDomains = redirectedDomains.split(",")
        redirectedDomains.pop() 
        if(url.match(new RegExp(""+redirectedDomains.join('$|')+"[]$"))){
            // console.log("url matched: ", url)
            return true
        } else {
            return false
        }
    }

};






