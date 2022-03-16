import file_system from 'fs';
import archiver from 'archiver';

var output = file_system.createWriteStream('files.zip');
var archive = archiver('zip');

output.on('close', function () {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err){
    throw err;
});

archive.pipe(output);

// append files from a sub-directory, putting its contents at the root of archive
archive.directory(`./yamlparse/images/`, false);


archive.finalize();