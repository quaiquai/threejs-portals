# 3D Web Component Readme

This HTML file creates a 3D web component using Three.js, allowing for the rendering of a scene with portals and custom pixel shaders. The web component consists of a main scene with various objects, including spheres, cubes, and cylinders, placed within portals. The portals render the scene from different perspectives, creating non-euclidean based geometry. The portals in the visualization form 3 sides of a cube where rotating the camera around shows 
different perspectives from the other cameras.

## Features

- **Portals:** The component includes portals, each rendering the scene from a different perspective. Objects inside the portals are visible in a cube like structure creating non-euclidean based illusions.
- **Pixel Shader:** The pixel shader is written to a fullscreen quad inside a framebuffer, creating a custom visual effect. This visual effect is then applied to the sphere in the scene as a texture. There is also a pixel shader written and applied directly to a cube that is calculated in screen space and moves with the camera.
- **Responsive Design:** The component is designed to be responsive giving orbital controls to the user.

## Dependencies

This 3D web component relies on the Three.js library for 3D graphics. The necessary dependencies are loaded using the `importmap` attribute within the `<script>` tag. Ensure that you have a stable internet connection to fetch the required Three.js files from the specified URLs.

## Usage

You could use this module as is by running the main.html file.

If you would like to import this module into another page, there are two ways to accomplish this:

###Embed via Import in script tag:

1.In your HTML file include this importmap that includes all packages needed to run this module
    `<script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@v0.149.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@v0.149.0/examples/jsm/"
            }
        }
    </script>`

2. Below the script importmap, create another script of type "module" and import the `portalRendering` function from the module and call the function.
    `<script type="module">
        import {portalRendering} from "./portalComponent.js"
        portalRendering();
    </script>`

3. Run a local server to host these files at URL where the web browser can access them. Doubling clicking on the html file will not work due to web-based security. You can run different types of servers. With Node.js just run `npx serve`. With python3.x you can run python -m http.server. Once ran navigate to the file from localhost and click it to run.

###iFrame Embedding

For this you can skip step 1 and 2 from the method above and in your HTML file embed the main.html in an iframe:
`<iframe src="main.html" width="1280" height="720"></iframe>`

Then you can proceed to step 3 from above.
