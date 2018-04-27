const express = require("express");
const logfmt = require("logfmt");
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const exec = require('executive');

const router = express.Router();

router.get("/", (req, res) => {
  // https://www.openstreetmap.org/way/448220597#map=19/-8.11742/-79.01687&layers=D
  // https://www.openstreetmap.org/way/90564392#map=17/-8.10327/-79.01803&layers=D


  var way = {
    id: 88609745,
    nodes: [1028951769,
      1098634669,
      5458544800,
      1412626535,
      1098614015,
      1098595474,
      1028951777,
      1098640731,
      1412626514,
      1028951755
    ]
  }
  // var way = {
  //   nodes: [1051000351,
  //     5432160615,
  //     5065176292,
  //     5065176294,
  //     1098625906
  //   ],
  //   id: 94612199
  // }
  // var way = {
  //   id: 90564392,
  //   nodes: [4452550921,
  //     4452550922,
  //     1098601537,
  //     1051000245,
  //     5483345195,
  //     1098620120,
  //     1088227476,
  //     1098585235,
  //     1098641105,
  //     1098641400,
  //     1088227388,
  //     1098647854,
  //     1098635414,
  //     1098584127,
  //     1098639238,
  //     1098633083,
  //     1098622426,
  //     5478475745,
  //     5476546741,
  //     2573525834
  //   ]
  // };
  // console.log(way)
  ignoreSegment(way, './data', function() {
    return res.json(way);
  });
});


function createSpeedProfile(speedProfileFile, way) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(speedProfileFile);

    file
      .on('open', () => {
        // Compute traffic profile.
        // https://github.com/Project-OSRM/osrm-backend/wiki/Traffic
        for (let i = 0; i < way.nodes.length - 2; i++) {
          if (i !== 0) {
            file.write('\n');
          }

          const node = way.nodes[i];
          const nextNode = way.nodes[i + 1];
          file.write(`${node},${nextNode},0\n`);
          file.write(`${nextNode},${node},0`);
        }
        file.end();
      })
      .on('error', err => reject(err))
      .on('finish', () => resolve());
  });
}

function ignoreSegment(way, osrmFolder, cb) {
  console.log('------------------------------------')
  const identifier = way.id;
  const speedProfileFile = `tmp/speed-${identifier}.csv`;
  const rootPath = path.resolve(__dirname, '../');
  // The dockerVolMount depends on whether we're running this from another docker
  // container or directly. See docker-compose.yml for an explanantion.
  const dockerVolMount = rootPath;

  // Paths for the files depending from where this is being run.
  // const pathOSRM = ROOT_DIR ? osrmFolder.replace(rootPath, ROOT_DIR) : osrmFolder;
  const pathSpeedProf = speedProfileFile;
  console.log('=========================================')
  console.log(pathSpeedProf)

  // tStart(`WAY ${identifier} traffic profile`)();
  createSpeedProfile(speedProfileFile, way)
    .then(function() {
      console.log('creo el csv')
    });

  var command = [
    'docker',
    'run',
    '--rm',
    '-t',
    '-v',
    '/Users/ruben/apps/osrm-local-server/data:/data',
    'osrm/osrm-backend:v5.16.4',
    'osrm-contract',
    '--segment-speed-file', pathSpeedProf,
    `./data/tr.osrm`
  ];
  console.log(command.join(' '));
  exec(command.join(' '), (error, stdout, stderr) => {
    if (error) {
      console.log(error)
    } else {
      console.log('ok....')
      cb()
    }
  });
}

module.exports = router;