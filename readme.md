# Getting Started

To run this CLI tool: 
```
git clone https://github.com/jase-k/full-website-audit.git
cd full-website-audit
npm install
npm i -g
```
Restart terminal
```
webAudit run // *Under Development* This will run the commands get-urls && audit synchronistically
```
## Commands: 

### webAudit get-urls
This command builds a list of unique urls that a particular domain contains. (An orphan pages that are not linked to any of your other pages will be left off) 

**How it Works:** This command will open up a headless chrome session and go to the provided -h (--host) or -e (--entrance) url path provided. When the page has loaded, it scans for 'href' tags and pulls urls from the website page. After filtering duplicates, file paths, and foreign domains the program adds these new urls to a list. (Every 10 urls scanned it saves the list to the folder (data/UNIQUEPATH/urlList.csv))


**To pull a list from a single host:** use the -h <string: URL> option 

EXAMPLE ```webAudit get-urls -h "https://example.com"```

**To pull a list of several domains:** use the -sd <string: PATH> option && -e or -h to choose a starting url

EXAMPLE ```webAudit get-urls -sd "./validurls.txt" -e "https://example.com"```

*NOTE: If a validurls.txt file is found in root directory of command the program will automatically try to use that. This file should be a list of domains and subdomains seperated by a comma with no spaces*

### webAudit audit
This commands takes a csv list of urls and runs a lighthouse scan on each url. After each url scan it will output data to a file in ./data/UNIQUEPATH/results.csv. You will be able to see an csv file of a summary of results as well as a folder of each full result in html format. 

**To audit a single url:** use the -u <string: URL> option 

EXAMPLE ```webAudit audit -u "https://example.com"```

**To audit a list multiple urls:** use the -ul <string: PATH> option 

EXAMPLE ```webAudit audit -ul ".data/urlList.csv" ```

