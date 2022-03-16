import confImport from 'conf'
// const conf = new confImport();
import chalk from'chalk';
import fs  from 'fs';
import lighthouse  from 'lighthouse';
import chromeLauncher  from 'chrome-launcher';


export default async function webAudit({url, urlListPath, detailed, removeErrors }){
    if (!url && !urlListPath){
        console.log(chalk.red.bold("a url or urlListPath is required! specify url by -u or urlListPath by -ul"))
        return
    }

    let date = new Date()

    //Creates Unique Folder Name
    let folderPath = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}(${date.getHours()}-${date.getMinutes()})audit`
    fs.mkdir(`data/${folderPath}/results/`, {recursive:true}, (err) => {
        if (err) throw err;
        console.log(chalk.green.bold(`directory data/${folderPath}/results/ successfully created`))    
        
        // Creating the Main Overview File
        let mainData = ''
        if(detailed){
            mainData = `URL Parsed, Error?,Final URL Inspected,Overall Performance, Time to Interaction, Need Next Gen Images?,   Overall SEO, Meta Data Test, Crawlable Link Test, Image Alt Test, Accessibility, Best Practices \n`
        } else {
            mainData = `URL Parsed, Error?, Final URL Inspected, Performance, SEO, Accessibility, Best Practices \n`
        }
        fs.writeFileSync(`data/${folderPath}/results.csv`, mainData);
        console.log(chalk.green("Created main file at: " + folderPath + "results.csv"))
    })
    


    //Write List of Arrays to csv Document
    let urlArrayToAudit = []
    try{
        let domainList = fs.readFileSync(urlListPath, {encoding: 'utf8'})
        urlArrayToAudit = domainList.split(",")
        console.log(chalk.green.bold("urlList.csv file found, will search these domains: " + domainList))
    }
    catch (e) {
        //Outputs what went wrong if user was trying to use a URL Path else outputs text confirming only a single url will be auditted
        if(urlListPath){
            console.log(e)
        }
        urlArrayToAudit.push(url)
        console.log(chalk.yellow.bold("No urlList.csv document found, will audit " + url + "only"))
    }

   
    recursivePromise(urlArrayToAudit, folderPath, detailed, removeErrors)
};

function recursivePromise(urlArrayToAudit, folderPath, detailed, removeErrors, idx=0){
    if(urlArrayToAudit.length == idx){
        return
    }
        runLighthouse(urlArrayToAudit, idx, folderPath, detailed, removeErrors)
        .then(result => recursivePromise(urlArrayToAudit, folderPath, detailed, removeErrors, result))            
}

// Returns a promise of the next index after completion
async function runLighthouse(urlArray, idx, folderPath, detailed, removeErrors){
    console.log(chalk.green.bold(`Running ${idx+1} of ${urlArray.length}`));
    let url = urlArray[idx]
    return new Promise(async (resolve, reject) => {
        const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
        const options = {output: 'html', onlyCategories: ['performance', 'seo', 'best-practices', 'accessibility'], port: chrome.port};

    
            console.log("Auditing: ", url)
            const runnerResult = await lighthouse(url, options);

            // `.report` is the HTML report as a string
            const reportHtml = runnerResult.report;
            
            chrome.kill().then(()=>{
                let results = runnerResult.lhr
                let runtimeError = results.runtimeError ? "YES" : "no"
                let mainData = ""

                if(detailed){
                    mainData = formatDetailedAudit(results)
                } else {
                    let { performance, seo, accessibility } = results.categories 
                    let bestPractices = results.categories['best-practices'] 
                    mainData = `${url},  ${runtimeError}, ${results.finalUrl}, ${performance.score * 100}, ${seo.score * 100}, ${accessibility.score * 100},  ${bestPractices.score * 100} \n`
                }

                if(runtimeError == "YES" && removeErrors ){
                    console.log(chalk.rgb(255,255,0)(`${results.requestedUrl} threw a RunTime Error, skipping and going to the next url`))
                    resolve(idx + 1);
                }  else {
                    
                    fs.writeFileSync(`data/${folderPath}/results/${idx}.html`, reportHtml);
                    //Uncomment below for a json file in the same folder
                    fs.writeFileSync(`data/${folderPath}/results/${idx}.json`, JSON.stringify(runnerResult));

                    // `.lhr` is the Lighthouse Result as a JS object
                    let { performance, seo, accessibility } = runnerResult.lhr.categories 
                    let bestPractices = runnerResult.lhr.categories['best-practices'] 
                    console.log('Report is done for', runnerResult.lhr.finalUrl);
                    consoleScore(performance.score, "Performance")
                    consoleScore(seo.score, "SEO")
                    consoleScore(bestPractices.score, "Best Practices")
                    consoleScore(accessibility.score, "Accessibility")
                    console.log(`Details at: ./data/${folderPath}/results/${idx}.html`)

                    // Adds Summary Details to main csv file
                    let CreateFiles = fs.createWriteStream(`data/${folderPath}/results.csv`, {flags:'a'})
                    CreateFiles.write(mainData);
                    resolve(idx + 1);
                }              
            })
            .catch(err => reject(err));
    })
}

function formatDetailedAudit(auditResult){
    let imageError, imageAlt, crawlableLinks, documentTitle = ""
    let runtimeError = auditResult.runtimeError ? "YES" : "no"
    let { performance, seo, accessibility } = auditResult.categories 
    let bestPractices = auditResult.categories['best-practices'] 

    if(auditResult.audits["modern-image-formats"].score == 0 || auditResult.audits["uses-responsive-images"].score == 0  ){
        imageError = "FAIL"
    } else {
        imageError = "PASS"
    }
    if(auditResult.audits["image-alt"].score == 0 ){
        imageAlt = "FAIL"
    } else {
        imageAlt = "PASS"
    }
    if(auditResult.audits["crawlable-anchors"].score == 0 ){
        crawlableLinks = "FAIL"
    } else {
        crawlableLinks = "PASS"
    }
    if(auditResult.audits["meta-description"].score == 0 || auditResult.audits["document-title"].score == 0  ){
        documentTitle = "FAIL"
    } else {
        documentTitle = "PASS"
    }
    let timeToInteract = Math.round((auditResult.audits.interactive.numericValue / 1000)*100/100)

    return `${auditResult.requestedUrl},  ${runtimeError}, ${auditResult.finalUrl}, ${performance.score * 100}, ${timeToInteract}, ${imageError}, ${seo.score * 100}, ${documentTitle}, ${crawlableLinks}, ${imageAlt}, ${accessibility.score * 100},  ${bestPractices.score * 100} \n`
}

function consoleScore(score, scoreName){
    if(score > 0.9){
        console.log(chalk.green(`${scoreName} was ${score}`))
    } else if (score > 0.6){
        console.log(chalk.rgb(255,255,0)(`${scoreName} was ${score}`))
    } else {
        console.log(chalk.red(`${scoreName} was ${score}`))
    }
}