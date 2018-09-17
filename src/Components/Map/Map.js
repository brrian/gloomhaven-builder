import { sample } from 'lodash';
import React, { PureComponent, createRef } from 'react';
import tileData from '../../tileData.json';
import './Map.css';
import sampleScenario from './sample-scenario.json';
import Scenario from '../Scenario/Scenario';

class Map extends PureComponent {
  state = {
    mapX: 0,
    mapY: 0,
    plopper: false,
    scale: .35,
    scenario: sampleScenario,
    plopperTileCoords: '0px, 0px',
    plopperRotation: 0,
  };

  constructor(props) {
    super(props);

    this.scenario = createRef();
  }

  get plopperCoords() {
    const { mouseX, mouseY } = this.state;
    const { x, y } = this.getAbsCoords(mouseX, mouseY);
    return `${x}px, ${y}px`;
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleMapClick = (event) => {
    const { plopper, scale } = this.state;

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

    if (plopper !== false) {
      if (plopper.type === 'tile') {
        this.plopTile(event.clientX, event.clientY);
      }
      this.setState({ plopper: false, plopperRotation: 0 });
    }
  }

  handleMouseDown = ({ clientX, clientY }) => {
    this.setState({ isPanning: true });
  }

  handleMouseUp = () => {
    this.setState({ isPanning: false });
  }

  handleMouseMove = ({ clientX, clientY }) => {
    const { isPanning } = this.state;

    this.setState({mouseX: clientX, mouseY: clientY });

    if (isPanning) {
      const deltaX = clientX - this.state.mouseX;
      const deltaY = clientY - this.state.mouseY;

      this.setState(({ mapX, mapY }) => ({
        mapX: mapX + deltaX,
        mapY: mapY + deltaY,
      }));
    }
  }

  handleKeyDown = (event) => {
    const { key } = event;

    if (key === 'r') {
      event.preventDefault();

      this.setState(({ plopperRotation }) => ({
        plopperRotation: plopperRotation + 30,
      }))
    } else if (key === 't') {
      event.preventDefault();

      // TO DO: Replace this temp func.
      // const nextTile = tileData['a1a'];
      const nextTile = sample(Object.values(tileData));
      this.setState({
        plopper: {
          type: 'tile',
          id: nextTile.name,
        },
        plopperCoords: this.plopperCoords,
      });
    } else if (key === 'm') {
      event.preventDefault();
      this.setState({
        plopper: {
          type: 'monster',
          id: 'inox-guard-h',
        },
        plopperCoords: this.plopperCoords,
      });
    }
  }

  plopTile(x, y) {
    const { plopper, plopperRotation } = this.state;

    this.scenario.current.placeTile(plopper.id, x, y, plopperRotation)
      .then(() => this.scenario.current.connectPlacedTileIfPossible(plopper.id));
  }
  getAbsCoords = (x, y) => {
    const { mapX, mapY, scale } = this.state;

    return {
      x: (x / scale) - (mapX / scale),
      y: (y / scale) - (mapY / scale),
    };
  }

  render() {
    const {
      mapX,
      mapY,
      scale,
      plopper,
      scenario,
      plopperRotation,
    } = this.state;

    return (
      <div
        className="map__wrapper"
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onMouseMove={this.handleMouseMove}
        onClick={this.handleMapClick}
      >
        <div className="map" style={{
          transform: `translate(${mapX}px, ${mapY}px) scale(${scale})`,
        }}>
          {plopper && (
            <div
              className="plopper-wrapper"
              style={{ transform: `translate(${this.plopperCoords}) rotate(${plopperRotation}deg)` }}
            >
              <img
                className="plopper"
                src={`images/${plopper.type}s/${plopper.id}.png`}
                data-type={plopper.type}
                alt=""
              />
            </div>
          )}
          <Scenario
            ref={this.scenario}
            getAbsCoords={this.getAbsCoords}
            scale={scale}
            {...scenario}
          />
        </div>
      </div>
    )
  }
}

export default Map;
