// Window.scrollTo(x, y) -> coordinates
// Continue to scroll down and wait until after 3 attempts the data window.scrolly value is the same

// In each link parse for the title, date, and content

// -> title: document.querySelector('.callout-header .page-title').innerHTML
// -> date: document.querySelector('.callout-header .date').innerHTML //may need to format this as a date
// -> content: (html) document.querySelector('#content").toString()
// -> type: window.location.path ? regex.match() regex = /case-studies|announcements|in-the-news/


// -> IMAGES
// -> content_images = content.querySelector('img')
// -> for each image go to url and save image in a folder. 
// -> change url tag to new file path
import chalk from'chalk';
import fs  from 'fs';
import chromeLauncher  from 'chrome-launcher';
import content_links from '../data/content_links.js'
import CDP from 'chrome-remote-interface';
import { url } from 'inspector';

export default async function webScraper(){

    let date = new Date()

    //Creates Unique Folder Name
    let folderPath = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}(${date.getHours()}-${date.getMinutes()})scrape`
    fs.mkdir(`data/${folderPath}/results/images`, {recursive:true}, (err) => {
        if (err) throw err;
        console.log(chalk.green.bold(`file path data/${folderPath}/results/images successfully created`))    
        
        // Creating the Main Overview File
        let mainData = ``
        fs.writeFileSync(`data/${folderPath}/general_content.yml`, mainData);
        console.log(chalk.green("Created main file at: " + folderPath + "general_content.yml"))
    })
    
    
    recursivePromise(0)


    function recursivePromise(idx){
        if(content_links.length == idx){
            return
        }
        pullWebsiteData(idx)
            .then(result => recursivePromise(result))            
    }
    
    function pullWebsiteData(idx){
        return new Promise(async (resolve, reject) => {
            
            console.log(chalk.green("On URL " + idx + " of " + content_links.length));
    
            console.log("Pulling data from : " + content_links[idx])
                
            //Change log level to info and comment out chromeFlags for debugging
            const chrome = await chromeLauncher.launch({
                chromeFlags: ['--headless'], 
                logLevel: 'info' 
            });
            const protocol = await CDP({port: chrome.port});
            
            // Extract the DevTools protocol domains we need and enable them.
            // See API docs: https://chromedevtools.github.io/devtools-protocol/
            const {Page, Runtime} = protocol;
            await Promise.all([Page.enable(), Runtime.enable()]);
            Page.navigate({url: content_links[idx]});
            // Wait for window.onload before doing stuff.
            Page.loadEventFired(async () => {
                const getContent = "document.querySelector('#content').outerHTML";
                const getContentTitle = "document.querySelector('.callout-header .page-title').innerHTML";
                const getContentDate = "document.querySelector('.callout-header .date').innerHTML";
                const getContentPath = "window.location.pathname"
                
                // Evaluate the JS expression in the page.
                const content = await Runtime.evaluate({expression: getContent});
                let contentTitle = await Runtime.evaluate({expression: getContentTitle});
                const contentDate = await Runtime.evaluate({expression: getContentDate});
                let contentPath = await Runtime.evaluate({expression: getContentPath});
                
                //pull content Type out of the url path since the pattern goes /learn/content_type/*
                contentPath = contentPath.result.value.substring(7)
                let regexIndex = contentPath.search('/') 
                const contentType = contentPath.substring(0,regexIndex)
                console.log(chalk.rgb(255,255,0)(`Content Type Found: ${toTitleCase(contentType)}`))
                console.log(chalk.rgb(255,255,0)(`Content Title Found: ${contentTitle.result.value}`))
                console.log(chalk.rgb(255,255,0)(`Content Date Found: ${contentDate.result.value}`))
                
                contentTitle = contentTitle.result.value
                let yamlData = `- '${contentTitle}':
                _slug: ${dasherize(contentTitle)}
                title: '${contentTitle}'
                date: '${contentDate.result.value}'
                page_type: '${toTitleCase(contentType)}'
                description: "${standardizeQuotes(content.result.value)}"\n
                `
                fs.appendFileSync(`data/${folderPath}/general_content.yml`, yamlData)
    
                fs.writeFileSync(`data/${folderPath}/results/content.html`, content.result.value);
                //parse html
                // let urlArray = parseUrlsFromHtml(htmlData)
    
    
    
                protocol.close();
                chrome.kill().then(() => {
                    console.log("Chrome is finished")
                    //wait 0.5 second so chrome can run again without interferance
                    setTimeout(() => {
                        resolve(idx+1)
                    }, 250)
                })
            
                
                
                
            })
            

        })
    }
};

function dasherize(string) {
    string = string.toLowerCase().trim()
    let i = 0
    while(i < string.length){
        if(string[i].match(/[A-Za-z0-9 ]/)){
            i++
            continue
        } else {
            console.log(string[i])
            string = string.substring(0,i) + string.substring(i+1)
            console.log(string)
        }
    }
    
    return string.replace(/(\s)/g, "-");
};

function standardizeQuotes(string) {
    return string.replace(/\"/g, "'");
};
function toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }