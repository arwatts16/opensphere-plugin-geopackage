goog.module('plugin.geopackage');

const log = goog.require('goog.log');


/**
 * @define {string}
 */
exports.ROOT = goog.define('plugin.geopackage.ROOT', '../opensphere-plugin-geopackage/');

/**
 * @define {string}
 */
exports.GPKG_PATH = goog.define('plugin.geopackage.GPKG_PATH', 'vendor/geopackage/geopackage.min.js');

/**
 * @type {string}
 * @const
 */
exports.ID = 'geopackage';


/**
 * The logger.
 * @const
 * @type {goog.debug.Logger}
 */
const LOGGER = log.getLogger('plugin.geopackage');


/**
 * @enum {string}
 */
exports.MsgType = {
  OPEN_LIBRARY: 'openLibrary',
  OPEN: 'open',
  CLOSE: 'close',
  LIST_DESCRIPTORS: 'listDescriptors',
  GET_TILE: 'getTile',
  GET_FEATURES: 'getFeatures',
  EXPORT: 'export',
  SUCCESS: 'success',
  ERROR: 'error'
};

/**
 * @enum {string}
 */
exports.ExportCommands = {
  CREATE: 'create',
  CREATE_TABLE: 'createTable',
  GEOJSON: 'geojson',
  WRITE: 'write',
  GET_CHUNK: 'getChunk',
  WRITE_FINISH: 'writeFinish'
};


/**
 * @type {?Worker}
 */
let worker_ = null;


/**
 * Get the Electron preload exports.
 * @return {Object|undefined}
 */
exports.getElectron = () => {
  return window.ElectronGpkg || undefined;
};


/**
 * If the app is running within Electron.
 * @return {boolean}
 */
exports.isElectron = () => {
  return !!exports.getElectron();
};


/**
 * @return {!Worker} The GeoPackage worker
 */
exports.getWorker = () => {
  if (!worker_) {
    let src = exports.ROOT + 'src/worker/gpkg.worker.js';

    const electron = exports.getElectron();
    if (electron) {
      // The node context (as opposed to the electron browser context), loads
      // paths relative to process.cwd(). Therefore, we need to make our source
      // path absolute.
      src = electron.resolveOpenspherePath(src);

      // spawn a child process and make it look like a worker

      // CLEVER HACK ALERT!
      // The child process has a node-only environment by default, rather than an Electron
      // environment. However, electron-builder only packages the version built for the
      // Electron environment.
      //
      // Therefore, pass the electron version to the script via an env variable so that
      // it can know that we intend to load Electron bindings for native modules rather
      // than node bindings.
      //
      // see associated hack in gpkg.worker.js
      const options = electron.getElectronEnvOptions();

      // to debug this guy:
      //  - open chrome://inspect/#devices
      //  - uncomment the debug option below
      //  - open the application
      //  - go to your chrome://inspect/#devices tab in Chrome
      //  - select "Inspect" on the newly visible item

      // DEBUG VERSION! Do not commit next line uncommented
      // options['execArgv'] = ['--inspect-brk'];

      worker_ = (electron.forkProcess(src, [], options));

      log.info(LOGGER, 'GeoPackage worker configured via node child process');
    } else {
      worker_ = new Worker(src);
      worker_.postMessage(/** @type {GeoPackageWorkerMessage} */ ({
        type: exports.MsgType.OPEN_LIBRARY,
        url: (!exports.GPKG_PATH.startsWith('/') ? '../../' : '') + exports.GPKG_PATH
      }));
      log.info(LOGGER, 'GeoPackage worker configured via web worker');
    }
  }

  return worker_;
};
