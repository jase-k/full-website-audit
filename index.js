#! /usr/bin/env node
import { program } from 'commander';
import webAudit from './commands/webAudit.js';

program
    .command('run')
    .description('audit your website with lighthouse')
    .option('-u, --url <string>')
    .action(webAudit)

program.parse()