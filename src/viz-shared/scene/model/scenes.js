import { items } from './items';
import { models } from './models';
import { programs } from './programs';
import { textures } from './textures';
import { VBODataSources, textureDataSources } from './enum';

const triggersToNames = {};

for (const itemName in items) {

    const item = items[itemName];
    const { triggers = [] } = item;

    let triggersIndex = -1;
    const triggersLen = triggers.length;
    while (++triggersIndex < triggersLen) {
        const trigger = triggers[triggersIndex];
        (triggersToNames[trigger] || (
            triggersToNames[trigger] = {})
        )[itemName] = true;
    }
}

const options = {
    'enable': [['BLEND'], ['DEPTH_TEST']],
    'disable': [['CULL_FACE']],
    'blendFuncSeparate': [['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ONE']],
    'blendEquationSeparate': [['FUNC_ADD', 'FUNC_ADD']],
    'depthFunc': [['LEQUAL']],
    'clearColor': [[51/255, 51/255, 57/255, 1.0]],
    'lineWidth': [[1]]
};

const transparentOptions = { ...options, ...{
    clearColor: [[51/255, 51/255, 57/255, 0.0]]
}};

const camera2D = {
    'type': '2d',
    'bounds': {'top': -1, 'left': 0, 'bottom': 0, 'right': 1},
    'nearPlane': -1,
    'farPlane': 10
};

const gis = {
    'options': options,
    'camera': camera2D,
    'clientMidEdgeInterpolation': false,
    //'numRenderedSplits':7 ,
    'render': [
        'pointpicking',  'pointsampling', 'uberdemoedges', 'edgepicking',
        'arrowculled', 'arrowhighlight', 'arrowselected', 'uberpointculled',
        'edgehighlight', 'edgeselected', 'fullscreen', 'fullscreenDummy',
        'fullscreenDark', 'pointhighlight', 'pointselected'
    ]
};

const scene = {
    'options': options,
    'camera': camera2D,
    'numRenderedSplits': 8,
    'clientMidEdgeInterpolation': true,
    'arcHeight': 0.2,
    'render': [
        'pointpicking',  'pointsampling', 'pointoutlinetexture',
        'pointculledtexture', 'midedgeculled', 'edgepicking', 'arrowculled',
        'arrowhighlight', 'edgehighlight', 'arrowselected', 'edgeselected',
        'pointoutline', 'pointculled', 'fullscreen', 'fullscreenDummy',
        'fullscreenDark', 'pointhighlight', 'pointselected'
    ]
};

const transparent = {
    'options': transparentOptions,
    'camera': camera2D,
    'numRenderedSplits': 8,
    'clientMidEdgeInterpolation': true,
    'arcHeight': 0.2,
    'render': [
        'pointpicking',  'pointsampling', 'pointoutlinetexture',
        'pointculledtexture', 'midedgeculled', 'edgepicking', 'arrowculled',
        'arrowhighlight', 'edgehighlight', 'arrowselected', 'edgeselected',
        'pointoutline', 'pointculled', 'fullscreen', 'fullscreenDummy',
        'fullscreenDark', 'pointhighlight', 'pointselected'
    ]
};

export const netflowStraight = {
    'options': options,
    'camera': camera2D,
    'numRenderedSplits': 0,
    'clientMidEdgeInterpolation': true,
    'render': [
        'pointpicking',  'pointsampling', 'pointoutlinetexture',
        'pointculledtexture', 'midedgeculled', 'edgepicking', 'arrowculled',
        'arrowhighlight', 'edgehighlight', 'arrowselected', 'edgeselected',
        'pointoutline', 'pointculled', 'fullscreen', 'fullscreenDummy',
        'fullscreenDark', 'pointhighlight', 'pointselected'
    ]
};

export const scenes = {
    'gis': generateScene(gis, items, models, programs, textures),
    'default': generateScene(scene, items, models, programs, textures),
    'transparent': generateScene(transparent, items, models, programs, textures),
    'netflowStraight': generateScene(netflowStraight, items, models, programs, textures)
};

function generateScene(scene, items, models, programs, textures) {

    const render = scene.render.slice();

    return function generate() {

        const generatedScene = render.reduce((scene, name) => {

            const { buffers: cBuffers, textures: cTextures,
                    triggers: cTriggers, targets: cTargets,
                    programs: cPrograms, uniforms: cUniforms,
                    items: cItems, modes: cModes, models: cModels,
                    server: { buffers: cServerBuffers, textures: cServerTextures }
                } = scene;

            const { index, uniforms, renderTarget, bindings,
                    program, otherBuffers, textureBindings = {} } =
                        cItems[name] = items[name];

            const { textures: pTextures } = cPrograms[program] = programs[program];

            if (pTextures) {
                for (const textureKey in textureBindings) {
                    const textureName = textureBindings[textureKey];
                    const texture = cTextures[textureName] = textures[textureName];
                    if (texture && texture.datasource === textureDataSources.SERVER) {
                        cServerTextures[textureName] = true;
                    }
                }
            }

            const iUniforms = cUniforms[name] = {};
            for (const uniformName in uniforms) {
                iUniforms[uniformName] = uniforms[uniformName].defaultValues;
            }

            for (const trigger in triggersToNames) {
                const names = triggersToNames[trigger];
                const triggers = cTriggers[trigger] || (cTriggers[trigger] = []);
                if (name in names) {
                    triggers.push(name);
                }
            }

            for (const bindingName in bindings) {
                const bufferBinding = bindings[bindingName];
                const [ modelName, attributeName ] = bufferBinding;
                const buffer = models[modelName][attributeName];
                const { datasource } = buffer;

                if (datasource === 'VERTEX_INDEX') {
                    cModes[datasource] = 1;
                } else if (datasource === 'EDGE_INDEX') {
                    cModes[datasource] = 2;
                } else if (datasource === VBODataSources.HOST ||
                           datasource === VBODataSources.DEVICE) {
                    cServerBuffers[modelName] = true;
                }

                cBuffers[modelName] = true;
                cModels[modelName] = { [attributeName]: buffer };
            }

            for (const bindingName in otherBuffers) {
                const bufferBinding = otherBuffers[bindingName];
                const [ modelName, attributeName ] = bufferBinding;
                const buffer = models[modelName][attributeName];
                const { datasource } = buffer;

                if (datasource === VBODataSources.HOST ||
                    datasource === VBODataSources.DEVICE) {
                    cServerBuffers[modelName] = true;
                }

                cBuffers[modelName] = true;
                cModels[modelName] = { [attributeName]: buffer };
            }

            if (renderTarget) {
                if (renderTarget !== 'CANVAS') {
                    cTargets[renderTarget] = true;
                }
                cTextures[renderTarget] = textures[renderTarget];
            }

            return scene;
        }, { ...scene, ...{
             modes : {}, triggers: {},
             items : {}, programs: {},
             buffers: {}, textures: {},
             server: { buffers: {}, textures: {} },
             models: {}, uniforms: {}, targets: {}
         }})

        generatedScene.modes = Object.values(generatedScene.modes).sort();
        generatedScene.targets = Object.keys(generatedScene.targets);
        generatedScene.buffers = Object.keys(generatedScene.buffers);
        generatedScene.server.buffers = Object.keys(generatedScene.server.buffers);
        generatedScene.server.textures = Object.keys(generatedScene.server.textures);

        return generatedScene;
    }
}