import { Map, OrderedMap } from 'immutable';
import { chain, isEqual, keyBy } from 'lodash';
import React, { PureComponent } from 'react';
import assetData from '../../assets.json';
import Tile from '../Tile/Tile';

class Scenario extends PureComponent {
  state = {
    availableConnections: [],
    tiles: OrderedMap(),
  };

  tileRefs = {};

  constructor(props) {
    super(props);

    this.placeExistingMonstersAndTokens = this.placeExistingMonstersAndTokens.bind(this);
  }

  componentDidMount() {
    const { connections } = this.props;

    if (connections.length) {
      this.placeExistingTiles().then(this.placeExistingMonstersAndTokens);
    }
  }

  placeExistingTiles() {
    const { connections, tiles } = this.props;

    const screenXMidpoint = window.innerWidth / 2;
    const screenYMidpoint = window.innerHeight / 2;

    return connections.reduce((promiseChain, connection) => {
      const { anchor, hook } = connection;
      const {
        [anchor.tile]: { rotation: anchorRotation },
        [hook.tile]: { rotation: hookRotation },
      } = tiles;

      const anchorTile = assetData.tiles.find(({ id }) => id === anchor.tile);
      const hookTile = assetData.tiles.find(({ id }) => id === hook.tile);

      return promiseChain.then((chainResults) => {
        const connectionPromise = Promise.all([
          this.placeTile(anchorTile, screenXMidpoint, screenYMidpoint, anchorRotation),
          this.placeTile(hookTile, screenXMidpoint, screenYMidpoint, hookRotation),
        ]).then(this.connectTile.bind(this, connection));

        return connectionPromise.then(result => [...chainResults, result]);
      });
    }, Promise.resolve([]));
  }

  placeExistingMonstersAndTokens() {
    const { tiles: propTiles } = this.props;
    const { tiles: stateTiles } = this.state;

    const tiles = stateTiles.withMutations(map => {
      Object.values(propTiles).forEach(({ name, monsters, tokens }) => {
        const {
          monstersMap,
          tokensMap,
        } = this.getExistingMonstersAndTokensAsMap(monsters, tokens);

        map.setIn([name, 'monsters'], monstersMap).setIn([name, 'tokens'], tokensMap);
      });
    });

    this.setState({ tiles });
  }

  getExistingMonstersAndTokensAsMap(monsters, tokens) {
    const monstersKey = keyBy(assetData.monsters, 'id');
    const tokensKey = keyBy(assetData.tokens, 'id');

    const monstersMap = Map(chain(monsters)
      .map(monster => ({ ...monstersKey[monster.id], ...monster }))
      .keyBy('pos')
      .value());

    const tokensMap = Map(chain(tokens)
      .map(token => ({ ...tokensKey[token.id], ...token }))
      .reduce((map, cur) => {
        const key = cur.canOverlay ? `overlay-${cur.pos}` : `${cur.pos}`;
        map[key] = cur;
        return map;
      }, {})
      .value());

    return { monstersMap, tokensMap };
  }

  placeTile(item, x, y, rotation) {
    return new Promise((resolve, reject) => {
      const { getAbsCoords } = this.props;
      const { tiles } = this.state;

      const { anchors, id, width, height } = item;

      if (tiles.has(id)) return resolve();

      const { x: absX, y: absY } = getAbsCoords(x, y);

      const tile = Map({
        ...item,
        monsters: Map(),
        rotation: rotation % 360,
        tokens: Map(),
        x: absX - (width / 2),
        y: absY - (height / 2),
      });

      const hooks = anchors.map((pos, index) => ({ tile: id, index }));

      this.setState(({ availableConnections, tiles: prevTiles }) => ({
        tiles: prevTiles.set(id, tile),
        availableConnections: [ ...availableConnections, ...hooks ],
      }), resolve);
    });
  }

  placeMonster({ id }, x, y) {
    const { hoveredTile } = this.props;
    const { tiles } = this.state;

    const pos = this.tileRefs[hoveredTile.name].getHexPosition(x, y);

    const updatedTiles = tiles.setIn([hoveredTile.name, 'monsters', `${pos}`], {
      name: id,
      pos,
      type: { 2: 'normal', 3: 'normal', 4: 'normal' },
    });

    return this.setState({ tiles: updatedTiles });
  }

  placeToken(item, x, y, rotation) {
    const { hoveredTile } = this.props;
    const { tiles } = this.state;

    const pos = this.tileRefs[hoveredTile.name].getHexPosition(x, y);

    // Some tokens can be overlaid on top of other tokens. In these cases we'll
    // want to set a special id for the Map so that up to two tokens can be in
    // the same position (one overlay and one regular token).
    const mapId = item.canOverlay ? `overlay-${pos}` : `${pos}`;

    const updatedTiles = tiles.setIn([hoveredTile.name, 'tokens', mapId], {
      ...item,
      pos,
      rotation,
    });

    return this.setState({ tiles: updatedTiles });
  }

  connectTile({ anchor, hook }) {
    return new Promise((resolve, reject) => {
      const { scale } = this.props;

      const anchorEl = this.tileRefs[anchor.tile].anchors[anchor.index];
      const hookEl = this.tileRefs[hook.tile].anchors[hook.index];

      const { x: anchorX, y: anchorY } = anchorEl.getBoundingClientRect();
      const { x: hookX, y: hookY } = hookEl.getBoundingClientRect();

      this.setState(({ availableConnections: prevConnections, tiles: prevTiles }) => {
        const newX = prevTiles.getIn([hook.tile, 'x']) + ((anchorX - hookX) / scale);
        const newY = prevTiles.getIn([hook.tile, 'y']) + ((anchorY - hookY) / scale);

        const tiles = prevTiles.withMutations(tiles => {
          tiles.setIn([hook.tile, 'x'], newX).setIn([hook.tile, 'y'], newY);
        });

        const availableConnections = prevConnections.filter(connection =>
          !(isEqual(connection, anchor) || isEqual(connection, hook)));

        return { availableConnections, tiles };
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
    const {
      handleTileMouseEnter,
      handleTileMouseLeave,
      scale,
    } = this.props;
    const { tiles } = this.state;

    return (
      <div>
        {tiles.toArray().map((tile, index) =>
          <Tile
            {...tile.toJSON()}
            handleTileMouseEnter={handleTileMouseEnter}
            handleTileMouseLeave={handleTileMouseLeave}
            key={tile.get('name')}
            order={index}
            ref={el => this.tileRefs[tile.get('name')] = el}
            scale={scale}
          />
        )}
      </div>
    );
  }
}

export default Scenario;
