import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import chromeLauncher  from 'chrome-launcher';
import CDP from 'chrome-remote-interface';



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
    fs.mkdirSync(`data/${folderPath}/urlList/`, {recursive:true})
    console.log(chalk.green.bold(`directory data/${folderPath}/urlList/ successfully created`))    
    


    console.log(chalk.yellow("Searching for URLS to parse: "))
    let urlSet = await aggregateUrlsFromSite(url, host, folderPath);

    console.log(chalk.red.bold(`You are about to audit ${urlSet.size} urls... continue?`))

    //Write List of Arrays to csv Document
    fs.writeFileSync(`data/${folderPath}/urlList.csv`, Array.from(urlSet).join(','))
};




function aggregateUrlsFromSite(url, host, folderPath, urlsToAudit= new Set().add(url), levels=0, counter=0){
    return new Promise(async (resolve, reject) => {
        if(urlsToAudit.size < counter){
            resolve(urlsToAudit)
        }
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
            const js = "document.querySelector('html').outerHTML";
            // Evaluate the JS expression in the page.
            const result = await Runtime.evaluate({expression: js});
            const htmlData = result.result.value
            fs.writeFileSync(`data/${folderPath}/urlList/test.html`, htmlData);

            //parse html
            let urlArray = parseUrlsFromHtml(htmlData)

            //add urls to urlsToAudit
            addURLToSet(urlArray, host, urlsToAudit)

            protocol.close();
            chrome.kill().then(() => {
                console.log("Chrome is finished")
                //wait 0.5 second so chrome can run again without interferance
                setTimeout(() => {
                    counter++
                    aggregateUrlsFromSite(url, host, folderPath, urlsToAudit, levels, counter)
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
        if((finalURL.match(httpsRegex) && finalURL.match(host))){
            // console.log(chalk.yellow("adding url to list for audit: ", finalURL ))
            urlSet.add(finalURL)
        } else if (finalURL[0] == "/"){
            finalURL = host + finalURL
            // console.log(chalk.yellow("adding url to list for audit: ", finalURL ))
            urlSet.add(finalURL)
        }
    })
}