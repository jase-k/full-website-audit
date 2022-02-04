#! /usr/bin/env node
import { program } from 'commander';
import webAudit from './commands/webAudit.js';

program
    .command('run')
    .description('audit your website with lighthouse')
    .action(webAudit)

program.parse()