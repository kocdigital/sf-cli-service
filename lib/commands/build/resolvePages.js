const resolveEntry = require('./resolveWcEntry');
const fs = require('fs')
const path = require('path')

function createheaders(api) {
    let viewFolder = 'views'

    if (process.env.VUE_APP_PAGES_FOLDER) {
        viewFolder = process.env.VUE_APP_PAGES_FOLDER;
    }

    const getDirectories =
        fs.readdirSync(api.resolve(`./src/${viewFolder}`), {withFileTypes: true})
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

    files = getDirectories.map(folder => `${viewFolder}/${folder}/${folder}.vue`);

    let synx = ''

    files.forEach(file => {

        const basename = path.basename(file).replace(/\.(jsx?|vue)$/, '');

        debugger
        if(api.buildenv){
            synx += `import ${basename} from '~root/src/${file}?shadow';\n`
        }else {
            synx += `import ${basename} from '@/${file}';\n`
        }
    });
    return synx
}

function createElements(api) {
    let viewFolder = 'views'

    if (process.env.VUE_APP_PAGES_FOLDER) {
        viewFolder = process.env.VUE_APP_PAGES_FOLDER;
    }

    const getDirectories =
        fs.readdirSync(api.resolve(`./src/${viewFolder}`), {withFileTypes: true})
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

    files = getDirectories.map(folder => `${viewFolder}/${folder}/${folder}.vue`);

    let synx = ''

    files.forEach(file => {

        const basename = path.basename(file).replace(/\.(jsx?|vue)$/, '');

        synx += `defineComponent(Vue, ${basename});\n`
    });
    return synx
}

exports.resolvePagesEntry = (api) => {
    const filePath = path.resolve(__dirname, 'entry-wc-main.js')
    const content = `
    import './setPublicPath'
import defineComponent from '@sf/web-component-wrapper';
import Vue from 'vue'
import 'css-loader/dist/runtime/api.js'
import 'vue-style-loader/lib/addStylesShadow'
import 'vue-loader/lib/runtime/componentNormalizer'
${createheaders(api)}
${createElements(api)}`.trim()
    fs.writeFileSync(filePath, content)
    return filePath
}

