import produce from 'immer';
import { chain, find, get, isEqual, keyBy, remove, set } from 'lodash';
import React, { PureComponent } from 'react';
import { IBaseAsset, ITileAsset, ITokenAsset } from '../../assets';
import assetData from '../../assets.json';
import { IConnection, IConnectionSet, IMonster, IToken } from '../Map/types';
import Tile from '../Tile/Tile';
import { IProps, IState, ITileMap } from './types';

class Scenario extends PureComponent<IProps, IState> {
  public state: Readonly<IState> = {
    availableConnections: [],
    tiles: [],
  };

  public tileRefs = {};

  public componentDidMount() {
    const { scenario: { connections } } = this.props;

    if (connections.length) {
      this.placeExistingTiles().then(this.placeExistingMonstersAndTokens);
    }
  }

  public placeTile(item: ITileAsset, x: number, y: number, rotation: number) {
    return new Promise((resolve, reject) => {
      const { getAbsCoords } = this.props;
      const { tiles } = this.state;

      const { anchors, id, width, height } = item;

      if (find(tiles, ['id', id])) {
        return resolve();
      }

      const { x: absX, y: absY } = getAbsCoords(x, y);

      const tile: ITileMap = {
        ...item,
        monsters: {},
        rotation: rotation % 360,
        tokens: {},
        x: absX - (width / 2),
        y: absY - (height / 2),
      };

      const hooks = anchors.map((pos, index) => ({ tile: id, index }));

      this.setState(produce<IState>(draft => {
        draft.availableConnections.push(...hooks);
        draft.tiles.push(tile);
      }), resolve);
    });
  }

  public placeMonster(item: IBaseAsset, x: number, y: number) {
    const { hoveredTile } = this.props;

    const pos = this.tileRefs[hoveredTile.name].getHexPosition(x, y);

    this.setState(produce<IState>(draft => {
      const tile = find(draft.tiles, ['id', hoveredTile.name]);

      if (tile) {
        tile.monsters[`${pos}`] = {
          ...item,
          pos,
          type: { 2: 'normal', 3: 'normal', 4: 'normal' },
        };
      } else {
        throw new Error(`Unable to find tile "${hoveredTile.name}".`);
      }
    }));
  }

  public placeToken(item: ITokenAsset, x: number, y: number, rotation: number) {
    const { hoveredTile } = this.props;

    const pos = this.tileRefs[hoveredTile.name].getHexPosition(x, y);

    // Some tokens can be overlaid on top of other tokens. In these cases we'll
    // want to set a special id for the Map so that up to two tokens can be in
    // the same position (one overlay and one regular token).
    const id = item.canOverlay ? `overlay-${pos}` : `${pos}`;

    this.setState(produce<IState>(draft => {
      const tile = find(draft.tiles, ['id', hoveredTile.name]);

      if (tile) {
        tile.tokens[id] = { ...item, pos, rotation };
      } else {
        throw new Error(`Unable to find tile "${hoveredTile.name}".`);
      }
    }));
  }

  public connectPlacedTileIfPossible(tile: string) {
    const { availableConnections } = this.state;

    const connections: { anchors: IConnection[], hooks: IConnection[] } = { anchors: [], hooks: [] };
    availableConnections.forEach(connection => {
      const target = connection.tile !== tile ? 'anchors' : 'hooks';
      connections[target].push(connection);
    });

    const anchors = connections.anchors.map(({ tile: tileId, index }): { bounds: DOMRect, connection: IConnection } => ({
      bounds: this.tileRefs[tileId].anchors[index].getBoundingClientRect(),
      connection: { tile: tileId, index },
    }));

    const hooks = connections.hooks.map(({ tile: tileId, index }): { bounds: DOMRect, connection: IConnection } => ({
      bounds: this.tileRefs[tileId].anchors[index].getBoundingClientRect(),
      connection: { tile: tileId , index },
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

  public render() {
    const {
      handleTileMouseEnter,
      handleTileMouseLeave,
      scale,
    } = this.props;
    const { tiles } = this.state;

    return (
      <div>
        {tiles.map((tile, index) =>
          <Tile
            {...tile}
            handleTileMouseEnter={handleTileMouseEnter}
            handleTileMouseLeave={handleTileMouseLeave}
            handleMonsterTypeClick={this.handleMonsterTypeClick}
            key={tile.id}
            order={index}
            ref={el => this.tileRefs[tile.id] = el}
            scale={scale}
          />
        )}
      </div>
    );
  }

  private handleMonsterTypeClick = (tileId: string, pos: number[], party: number) => {
    const nextTypes = {
      elite: 'hidden',
      hidden: 'normal',
      normal: 'elite',
    };

    this.setState(produce<IState>(draft => {
      const tile = find(draft.tiles, ['id', tileId]);

      if (tile) {
        const currentType: string = get(tile, `monsters.${pos}.type.${party}`);
        set(tile, `monsters.${pos}.type.${party}`, nextTypes[currentType]);
      } else {
        throw new Error(`Unable to find tile "${tileId}".`);
      }
    }));
  }

  private placeExistingTiles() {
    const { scenario: { connections, tiles } } = this.props;

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

      if (!anchorTile) {
        throw new Error(`Unable to find anchor tile "${anchor.tile}"`);
      }

      if (!hookTile) {
        throw new Error(`Unable to find hook tile "${hook.tile}"`);
      }

      return promiseChain.then((chainResults) => {
        const connectionPromise = Promise.all([
          this.placeTile(anchorTile, screenXMidpoint, screenYMidpoint, anchorRotation),
          this.placeTile(hookTile, screenXMidpoint, screenYMidpoint, hookRotation),
        ]).then(this.connectTile.bind(this, connection));

        return connectionPromise.then(result => [...chainResults, result]);
      });
    }, Promise.resolve([]));
  }

  private placeExistingMonstersAndTokens = () => {
    const { scenario: { tiles: propTiles } } = this.props;

    this.setState(produce<IState>(draft => {
      Object.values(propTiles).forEach(({ id, monsters, tokens }) => {
        const tile = find(draft.tiles, ['id', id]);
        if (tile) {
          tile.monsters = this.convertExistingMonsters(monsters);
          tile.tokens = this.convertExistingTokens(tokens);
        }
      });
    }));
  }

  private convertExistingMonsters(monsters: IMonster[]) {
    const monstersKey = keyBy(assetData.monsters, 'id');

    return chain(monsters)
      .map(monster => ({ ...monstersKey[monster.id], ...monster }))
      .keyBy('pos')
      .value();
  }

  private convertExistingTokens(tokens: IToken[]) {
    const tokensKey = keyBy(assetData.tokens, 'id');

    return chain(tokens)
      .map(token => ({ ...tokensKey[token.id], ...token }))
      .reduce((map, cur) => {
        const key = cur.canOverlay ? `overlay-${cur.pos}` : `${cur.pos}`;
        map[key] = cur;
        return map;
      }, {})
      .value();
  }

  private connectTile({ anchor, hook }: IConnectionSet) {
    return new Promise(resolve => {
      const { scale } = this.props;

      const anchorEl = this.tileRefs[anchor.tile].anchors[anchor.index];
      const hookEl = this.tileRefs[hook.tile].anchors[hook.index];

      const { x: anchorX, y: anchorY } = anchorEl.getBoundingClientRect();
      const { x: hookX, y: hookY } = hookEl.getBoundingClientRect();

      this.setState(produce<IState>(draft => {
        const hookTile = find(draft.tiles, ['id', hook.tile]);

        if (hookTile) {
          hookTile.x += (anchorX - hookX) / scale;
          hookTile.y += (anchorY - hookY) / scale;
        } else {
          throw new Error(`Unable to find hook tile "${hook.tile}".`);
        }

        remove(draft.availableConnections, connection =>
          isEqual(connection, anchor) || isEqual(connection, hook));
      }), resolve);
    });
  }
}

export default Scenario;
