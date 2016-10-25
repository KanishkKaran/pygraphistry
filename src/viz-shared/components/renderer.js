if (__CLIENT__) {
    module.exports = require('viz-client/components/renderer').Renderer;
} else {
    module.exports = function RendererComponent() {
        return (
            <div style={{
                    width: `100%`,
                    height:`100%`,
                    position:`absolute`
                }}
            />
        );
    };
}