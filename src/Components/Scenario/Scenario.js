import { chain } from 'lodash';
import React, { Component } from 'react';
import tileData from '../../tileData.json';
import Tile from '../Tile/Tile';

class Scenario extends Component {
  state = {
    availableConnections: [],
    tiles: [],
  };

  tileRefs = {};

  componentDidMount() {
    const { connections } = this.props;

    if (connections.length) {
      this.placeExistingTiles();
    }
  }

  placeExistingTiles() {
    const { connections, tiles } = this.props;

    const screenXMidpoint = window.innerWidth / 2;
    const screenYMidpoint = window.innerHeight / 2;

    connections.reduce((promiseChain, connection) => {
      const { anchor, hook } = connection;

      const anchorData = tiles.find(tile => tile.name === anchor.tile);
      const hookData = tiles.find(tile => tile.name === hook.tile);

      return promiseChain.then((chainResults) => {
        const connectionPromise = Promise.all([
          this.placeTile(anchor.tile, screenXMidpoint, screenYMidpoint, anchorData.rotation),
          this.placeTile(hook.tile, screenXMidpoint, screenYMidpoint, hookData.rotation),
        ]).then(this.connectTile.bind(this, connection));

        return connectionPromise.then(result => [...chainResults, result]);
      });
    }, Promise.resolve([]));
  }

  placeTile(name, x, y, rotation) {
    return new Promise((resolve, reject) => {
      const { map } = this.props;
      const { tiles } = this.state;
      const { anchors, width, height } = tileData[name];

      if (tiles.find(tile => tile.name === name)) return resolve();

      const tile = {
        name,
        x: (x / map.scale) - (width / 2) - (map.x / map.scale),
        y: (y / map.scale) - (height / 2) - (map.y / map.scale),
        rotation: rotation % 360,
      };

      const hooks = anchors.map((pos, index) => ({ tile: name, index }));

      this.setState(({ availableConnections, tiles: prevTiles }) => ({
        tiles: [...tiles, tile],
        availableConnections: [ ...availableConnections, ...hooks ],
      }), resolve);
    });
  }

  connectTile({ anchor, hook }) {
    return new Promise((resolve, reject) => {
      const { map: { scale } } = this.props;

      const anchorEl = this.tileRefs[anchor.tile].anchors[anchor.index];
      const hookEl = this.tileRefs[hook.tile].anchors[hook.index];

      const { x: anchorX, y: anchorY } = anchorEl.getBoundingClientRect();
      const { x: hookX, y: hookY } = hookEl.getBoundingClientRect();

      this.setState(({ tiles: prevTiles }) => {
        const tiles = [ ...prevTiles ];
        const updatedHook = tiles.find(({ name }) => name === hook.tile);
        updatedHook.x += (anchorX - hookX) / scale;
        updatedHook.y += (anchorY - hookY) / scale;
        return { tiles }
      }, resolve);
    });
  }

  connectPlacedTileIfPossible(tile) {
    const { availableConnections } = this.state;

    const connections = availableConnections.reduce((prev, cur) => {
      const target = cur.tile !== tile ? 'anchors' : 'hooks';
      prev[target].push(cur);
      return prev;
    }, { anchors: [], hooks: [] });

    const anchors = connections.anchors.map(({ tile, index }) => ({
      connection: { tile, index },
      bounds: this.tileRefs[tile].anchors[index].getBoundingClientRect(),
    }));

    const hooks = connections.hooks.map(({ tile, index }) => ({
      connection: { tile, index },
      bounds: this.tileRefs[tile].anchors[index].getBoundingClientRect(),
    }));

    const match = chain(anchors)
      .map(anchor => hooks.map(hook => {
        const leftBounds = anchor.bounds.right - hook.bounds.left;
        const rightBounds = anchor.bounds.left - hook.bounds.right;
        const topBounds = anchor.bounds.top - hook.bounds.bottom;
        const bottomBounds = anchor.bounds.bottom - hook.bounds.top;

        const doesOverlap = leftBounds > 0 && rightBounds < 0 && topBounds < 0 && bottomBounds > 0;
        const closeness = Math.abs(leftBounds + rightBounds + topBounds + bottomBounds);

        return doesOverlap
          ? { anchor: anchor.connection, hook: hook.connection, closeness }
          : false;
      }))
      .flatten().compact().sortBy('closeness').first().value();

    if (match) {
      this.connectTile(match);
    }
  }

  render() {
    const { tiles } = this.state;

    return (
      <div>
        {tiles.map(tile =>
          <Tile ref={el => this.tileRefs[tile.name] = el} key={tile.name} {...tile} />
        )}
      </div>
    );
  }
}

export default Scenario;
