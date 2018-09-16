import { sample } from 'lodash';
import React, { Component, createRef } from 'react';
import tileData from '../../tileData.json';
import './Map.css';
import sampleScenario from './sample-scenario.json';
import Scenario from '../Scenario/Scenario';

class Map extends Component {
  state = {
    mapX: 0,
    mapY: 0,
    scale: .35,
    scenario: sampleScenario,
    selectedTile: '',
    selectedTileCoords: '0px, 0px',
    selectedTileRotation: 0,
  };

  constructor(props) {
    super(props);

    this.scenario = createRef();
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleMapClick = (event) => {
    const { scale, selectedTile, selectedTileRotation } = this.state;

    if (false && event.target.dataset.tile) {
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
      this.scenario.current.placeTile(selectedTile, event.clientX, event.clientY, selectedTileRotation)
        .then(() => this.scenario.current.connectPlacedTileIfPossible(selectedTile));

      this.setState({ selectedTile: null, selectedTileRotation: 0 });
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
      const deltaX = clientX - this.state.panX;
      const deltaY = clientY - this.state.panY;

      this.setState(({ mapX, mapY }) => ({
        mapX: mapX + deltaX,
        mapY: mapY + deltaY,
        panX: clientX,
        panY: clientY,
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

  render() {
    const {
      mapX,
      mapY,
      scale,
      scenario,
      selectedTile,
      selectedTileCoords,
      selectedTileRotation,
    } = this.state;

    return (
      <div
        className="map__wrapper"
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
        <div className="map" style={{
          transform: `translate(${mapX}px, ${mapY}px) scale(${scale})`,
        }}>
          <Scenario ref={this.scenario} {...scenario} map={{ scale, x: mapX, y: mapY }} />
        </div>
      </div>
    )
  }
}

export default Map;
