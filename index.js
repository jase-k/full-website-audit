#! /usr/bin/env node
import { program } from 'commander';
import webAudit from './commands/webAudit.js';
import getUrls from './commands/getUrls.js';
import webScraper from './commands/webScraper.js';

program
    .command('run')
    .description('audit your website with lighthouse')
    .option('-h, --host <string>', 'enter the host of the website you want to audit')
    .option('-sd, --subdomainPath <string>', 'enter the path of a .txt file of the domains you want included in the web audit')
    .option('-l, --levels <integer>', 'enter the number of levels deep you want to crawl. (0= infinity; Default is 0)')
    .option('-e, --entrance <string>', 'enter the url of the page you want to start the crawl from')
    .action()


program
    .command('get-urls')
    .description('Crawl your domain/s to get a list of all public urls')
    .option('-h, --host <string>', 'enter the host of the website you want to start with')
    .option('-sd, --subdomainPath <string>', 'enter the path of a .txt file of the domains you want included in the web crawl')
    .option('-l, --levels <integer>', 'enter the number of levels deep you want to crawl. (0= infinity; Default is 0) *Currently unsupported*')
    .option('-e, --entrance <string>', 'enter the url of the page you want to start the crawl from')
    .option('-r, --redirects <boolean>', 'Include redirected domains? default: true')
    .action(getUrls)

program
    .command('audit')
    .description('audit your website with lighthouse')
    .option('-u, --url <string>', 'enter the url of the website you want to audit')
    .option('-ul, --urlListPath <string>', 'enter the path of a .csv file of the domains you want included in the web audit')
    .option('--detailed <boolean>', 'more data provided on final csv file')
    .option('--removeErrors <boolean>', 'remove runtime errors from report')
    .action(webAudit)

program
    .command('pull-content')
    .description('scrape content from lulzbot.com')
    .option('-u, --url <string>', 'enter the url of the website you want to audit')
    .option('-ul, --urlListPath <string>', 'enter the path of a .csv file of the domains you want included in the web audit')
    .action(webScraper)

program.parse()