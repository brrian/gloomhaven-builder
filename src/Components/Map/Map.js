import { chain, sample } from 'lodash';
import React, { Component } from 'react';
import tileData from '../../tileData.json';
import './Map.css';

class Map extends Component {
  state = {
    availableHooks: [],
    scale: .35,
    selectedTile: '',
    selectedTileCoords: '0px, 0px',
    selectedTileRotation: 0,
    tiles: [],
    tilesX: 0,
    tilesY: 0,
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleMapClick = (event) => {
    const { scale, selectedTile } = this.state;

    if (event.target.dataset.tile) {
      const data = tileData[event.target.dataset.tile];
      const tile = this.state.tiles.find(({ name }) => name === event.target.dataset.tile);

      const origin = event.target.querySelector('.origin');
      const { x: originX, y: originY } = origin.getBoundingClientRect();

      const dot = document.createElement('div');

      const rads = tile.rotation * (Math.PI / 180);

      const x = ((event.clientX - originX) / scale);
      const y = -((event.clientY - originY) / scale);

      const left = (x * Math.cos(rads)) - (y * Math.sin(rads));
      const bottom = (x * Math.sin(rads)) + (y * Math.cos(rads));

      dot.classList.add('dot');
      dot.style.bottom = bottom + 'px';
      dot.style.left = left + 'px';
      event.target.appendChild(dot);

      const file = Math.round((left - data.startHex[0]) / 200) + 1;
      const rank = Math.round((bottom - (data.height - data.startHex[1])) / 190) + 1;

      console.log(bottom, data.height, data.startHex[1]);
      console.log([rank, file], bottom - data.height - data.startHex[1])
    }

    if (selectedTile) {
      this.placeSelectedTile(event.clientX, event.clientY);
    }
  }

  handleMouseDown = ({ clientX, clientY }) => {
    this.setState({
      isPanning: true,
      panX: clientX,
      panY: clientY,
    });
  }

  handleMouseUp = () => {
    this.setState({
      isPanning: false,
      panX: 0,
      panY: 0,
    });
  }

  handleMouseMove = ({ clientX, clientY }) => {
    const { selectedTile } = this.props;
    const { isPanning } = this.state;

    if (isPanning) {
      const deltaX = (clientX - this.state.panX) * 1;
      const deltaY = (clientY - this.state.panY) * 1;

      console.log('deltaX', deltaX, 'deltaY', deltaY);

      this.setState(({ tilesX, tilesY }) => ({
        panX: clientX,
        panY: clientY,
        tilesX: tilesX + deltaX,
        tilesY: tilesY + deltaY,
      }));
    }

    if (selectedTile) {
      this.setState({
        selectedTileCoords: `${clientX}px, ${clientY}px`,
      })
    }
  }

  handleKeyDown = (event) => {
    const { key } = event;

    if (key === 'r') {
      event.preventDefault();

      this.setState(({ selectedTileRotation }) => ({
        selectedTileRotation: selectedTileRotation + 30,
      }))
    } else if (key === 't') {
      event.preventDefault();

      // TO DO: Replace this temp func.
      // const nextTile = tileData['a1a'];
      const nextTile = sample(Object.values(tileData));
      this.setState({
        selectedTile: nextTile.name,
      });
    }
  }

  placeSelectedTile(x, y) {
    const { scale, selectedTile, selectedTileRotation } = this.state;
    const selectedTileData = tileData[selectedTile];

    const tile = {
      name: selectedTile,
      x: x - ((selectedTileData.width * scale) / 2),
      y: y - ((selectedTileData.height * scale) / 2),
      rotation: selectedTileRotation % 360,
    }

    const hooks = selectedTileData.anchors.map((pos, index) => `${selectedTile}-${index}`);

    this.setState(prevState => ({
      selectedTile: null,
      selectedTileRotation: 0,
      tiles: [ ...prevState.tiles, tile ],
      availableHooks: [
        ...prevState.availableHooks,
        ...hooks,
      ]
    }), this.connectPlacedTileIfPossible.bind(this, tile, hooks));
  }

  connectPlacedTileIfPossible(tile, tileAnchors) {
    const { availableHooks } = this.state;

    const anchors = tileAnchors.map(id => ({ id, bounds: document.getElementById(id).getBoundingClientRect() }));

    const hooks = availableHooks
      .filter(id => id.indexOf(tile.name) === -1)
      .map(id => ({ id, bounds: document.getElementById(id).getBoundingClientRect() }));

    const match = chain(anchors)
      .map(anchor => hooks.map(hook => {
        const leftBounds = anchor.bounds.right - hook.bounds.left;
        const rightBounds = anchor.bounds.left - hook.bounds.right;
        const topBounds = anchor.bounds.top - hook.bounds.bottom;
        const bottomBounds = anchor.bounds.bottom - hook.bounds.top;

        const doesOverlap = leftBounds > 0 && rightBounds < 0 && topBounds < 0 && bottomBounds > 0;
        const closeness = Math.abs(leftBounds + rightBounds + topBounds + bottomBounds);

        const anchorXMidpoint = anchor.bounds.left + (anchor.bounds.width / 2);
        const anchorYMidpoint = anchor.bounds.top + (anchor.bounds.height / 2);

        const hookXMidpoint = hook.bounds.left + (hook.bounds.width / 2);
        const hookYMidpoint = hook.bounds.top + (hook.bounds.height / 2);

        return doesOverlap ?
          {
             anchor: anchor.id,
             hook: hook.id,
             xOffset: anchorXMidpoint - hookXMidpoint,
             yOffset: anchorYMidpoint - hookYMidpoint,
             closeness,
          }
          : false;
      }))
      .flatten()
      .compact()
      .sortBy('closeness')
      .first()
      .value();

    if (!match) return;

    this.setState(prevState => {
      const tiles = [ ...prevState.tiles ];
      const updatedTile = tiles.find(({ name }) => tile.name === name);

      updatedTile.x -= match.xOffset;
      updatedTile.y -= match.yOffset;

      return { tiles };
    });
  }

  render() {
    const {
      scale,
      selectedTile,
      selectedTileCoords,
      selectedTileRotation,
      tiles,
      tilesX,
      tilesY,
    } = this.state;

    return (
      <div
        className="map"
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onMouseMove={this.handleMouseMove}
        onClick={this.handleMapClick}
      >
        {selectedTile && (
          <div
            className="selectedTile__wrapper"
            style={{
              transform: `translate(${selectedTileCoords}) rotate(${selectedTileRotation}deg)`,
            }}
          >
            <div
              className="selectedTile"
              style={{
                width: tileData[selectedTile].width,
                height: tileData[selectedTile].height,
                backgroundImage: `url(images/tiles/${selectedTile}.png)`,
                transform: `scale(${scale}) translate(-50%, -50%)`,
              }}
            />
          </div>
        )}
        <div className="tiles" style={{
          transform: `translate(${tilesX}px, ${tilesY}px)`,
        }}>
          {tiles.map(({ name, x, y, rotation }) => (
            <div
              key={name}
              className="tile__wrapper"
              style={{
                top: y,
                left: x,
                width: tileData[name].width * scale,
                height: tileData[name].height * scale,
                transform: `rotate(${rotation}deg)`
              }}
            >
              <div
                className="tile"
                data-tile={name}
                style={{
                  width: tileData[name].width,
                  height: tileData[name].height,
                  backgroundImage: `url(images/tiles/${name}.png)`,
                  transform: `scale(${scale})`,
                }}
              >
                <div className="origin" />
                {tileData[name].anchors.map((pos, index) => (
                  <div
                    key={`${name}${pos}`}
                    id={`${name}-${index}`}
                    className="anchor"
                    style={{ top: pos[1], left: pos[0] }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
}

export default Map;
