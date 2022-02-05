#! /usr/bin/env node
import { program } from 'commander';
import webAudit from './commands/webAudit.js';

program
    .command('run')
    .description('audit your website with lighthouse')
    .option('-h, --host <string>', 'enter the host of the website you want to audit')
    .option('-sd, --subdomainPath <string>', 'enter the path of a .txt file of the domains you want included in the web audit')
    .option('-l, --levels <integer>', 'enter the number of levels deep you want to crawl. (0= infinity; Default is 0)')
    .option('-e, --entrance <string>', 'enter the url of the page you want to start the crawl from')
    .action(webAudit)

program.parse()