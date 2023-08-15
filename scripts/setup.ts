import { execSync } from 'child_process'

execSync('rm -rf assets')
console.log('Downloading Assets')
execSync('curl "http://121.40.123.198:8080/AutoKit/AutoKit.apk" > AutoKit.apk')
console.log('file downloaded, unzipping')
execSync("unzip AutoKit.apk 'assets/*'")
execSync('rm AutoKit.apk')
