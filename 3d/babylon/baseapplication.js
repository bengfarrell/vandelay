import BaseConfig from './baseconfig.js';
import BaseGroup from './basegroup.js';
import EventListener from '../../events/eventlistener.js';

export default class BaseApplication extends EventListener {
    constructor(el, cfg) {
        super();
        this.appConfig = BaseConfig.apply(cfg);
        this.element = el;
        this.engine = new BABYLON.Engine(this.element, this.appConfig.engine.antialias, this.appConfig.engine.options);
        this.engine.enableOfflineSupport = false;
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.useRightHandedSystem = this.appConfig.scene.useRightHandedSystem;

        this.isApplication = true;
        this.engine.runRenderLoop( () => this.tick() );

        this.cameras = [];
        this.lights = [];

        if (this.appConfig.camera) {
            this.addCamera(this.appConfig.camera.type, this.appConfig.camera.options);
        }

        if (this.appConfig.lights) {
            this.addLights(this.appConfig.lights);
        }

        if (this.appConfig.inspector) {
            document.addEventListener('keydown', e => this.onKeyDown(e) );
        }
        this.root = new BaseGroup();
        this.root.parent = this;
        this.root.initializeGroup(this.scene, 'application-root');
        this.root.onParented(this.scene, this, this.element);

        window.addEventListener('resize', () => this.onResize());
    }

    get canvas() { return this.element; }

    get name() { return 'root'; }

    /**
     * convenience method to add a typical camera
     */
    addCamera(type, options) {
        if (!type) {
            type = 'freecamera';
        }

        if (!options.position) {
            options.position = new BABYLON.Vector3(0, 0, 0);
        } else {
            options.position = new BABYLON.Vector3(options.position.x, options.position.y, options.position.z);
        }

        let camera;
        switch (type) {
            case 'default':
            case 'freecamera':
                camera = new BABYLON.FreeCamera('camera', options.position, this.scene);
                break;

            case 'arcrotate':
                camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, 0, 0, BABYLON.Vector3.Zero(), this.scene);
                camera.setPosition(options.position);
                camera.attachControl(this.element, true);
                break;

            default:
                console.error('Camera not added, ', type, ' is not found');
        }

        if (options.useMouseControls) {
            camera.attachControl(this.element, true);
        }
        this.cameras.push(camera);
    }

    /**
     * convenience method to add a typical light
     */
    addLights() {
        let light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

    }

    get config() {
        return this.appConfig;
    }

    /**
     * render engine tick
     */
    tick() {
        if (!this.initialized) {
            this.onCreate(this.scene);
            this.initialized = true;
        }
        if (this.initialized && this.cameras.length > 0) {
            this.scene.render();
            this.onRender(this.engine.getDeltaTime());
        }
    }

    /**
     * replace all scenes starting with application and spidering through children, restarting all render loops
     * @param scene
     * @param children
     */
    replaceAllScenes(scene, children) {
        if (!children) {
            this.engine.stopRenderLoop();

            this.scene = scene;
            this.root.scene = scene;
            children = this.root.children;
            this.engine.runRenderLoop( () => this.tick() );
        }
        for (let c = 0; c < children.length; c++) {
            if (children[c].isGroup) {
                children[c].scene = scene;
            }

            if (children[c].children && children[c].children.length > 0) {
                this.replaceAllScenes(scene, children[c].children);
            }
        }
    }

    add(objects) { return this.root.add(objects); }
    remove(objects) { return this.root.remove(objects); }
    removeAll(objects) { this.root.removeAll(objects); }
    find(name) { return this.root.find(name); }

    onKeyDown(e) {
        if (this.config.inspector) {
            if (e.keyCode === this.config.inspector || String.fromCharCode(e.keyCode).toLowerCase() === this.config.inspector ) {
                if (this.scene.debugLayer.isVisible()) {
                    this.scene.debugLayer.hide();
                } else {
                    this.scene.debugLayer.show();
                }
            }
        }
    }

    onResize() {
        this.engine.resize();
    }

    onCreate(sceneEl) {}
    onRender(time) {}
}
