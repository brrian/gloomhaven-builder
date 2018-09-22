import classNames from 'classnames';
import React, { createRef, PureComponent } from 'react';
import Plopper from '../Plopper/Plopper';
import Scenario from '../Scenario/Scenario';
import './Map.css';
import sampleScenario from './sample-scenario.json';

class Map extends PureComponent {
  state = {
    hoveredTile: { name: false, orientation: 'h', rotation: 0 },
    isAbleToPan: false,
    isPanning: false,
    mapX: 0,
    mapY: 0,
    scale: .35,
    scenario: sampleScenario,
  };

  constructor(props) {
    super(props);

    this.scenario = createRef();
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  handleTileMouseEnter = (name, rotation, orientation) => {
    this.setState({ hoveredTile: { name, rotation, orientation } });
  }

  handleTileMouseLeave = () => {
    this.setState(({ hoveredTile}) => ({
      hoveredTile: { ...hoveredTile, name: false }
    }));
  }

  handleMouseDown = () => {
    const { isAbleToPan } = this.state;

    if (isAbleToPan) {
      this.setState({ isPanning: true });
    }
  }

  handleMouseUp = () => {
    const { isPanning } = this.state;

    if (isPanning) {
      this.setState({ isPanning: false });
    }
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

    if (key === ' ') {
      this.setState({ isAbleToPan: true })
    }
  }

  handleKeyUp = (event) => {
    const { key } = event;

    if (key === ' ') {
      this.setState({ isAbleToPan: false, isPanning: false });
    }
  }

  handleItemPlopped = (id, type, x, y, rotation) => {
    const scenario = this.scenario.current;

    if (type === 'tile') {
      scenario.placeTile(id, x, y, rotation).then(() => scenario.connectPlacedTileIfPossible(id));
    } else if (type === 'monster') {
      scenario.placeMonster(id, x, y);
    } else if (type === 'token') {
      const { hoveredTile: { rotation: tileRotation } } = this.state;
      scenario.placeToken(id, x, y, rotation - tileRotation);
    }
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
      hoveredTile,
      isAbleToPan,
      isPanning,
      mapX,
      mapY,
      mouseX,
      mouseY,
      scale,
      scenario,
    } = this.state;

    return (
      <div
        className={classNames(
          'Map__Wrapper',
          { isAbleToPan, isPanning },
        )}
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onMouseMove={this.handleMouseMove}
      >
        <Plopper
          handleItemPlopped={this.handleItemPlopped}
          hoveredTile={hoveredTile}
          isAbleToPan={isAbleToPan}
          scale={scale}
          x={mouseX}
          y={mouseY}
        />
        <div className="Map" style={{
          transform: `translate(${mapX}px, ${mapY}px) scale(${scale})`,
        }}>
          <Scenario
            {...scenario}
            getAbsCoords={this.getAbsCoords}
            handleTileMouseEnter={this.handleTileMouseEnter}
            handleTileMouseLeave={this.handleTileMouseLeave}
            hoveredTile={hoveredTile}
            ref={this.scenario}
            scale={scale}
          />
        </div>
      </div>
    )
  }
}

export default Map;
