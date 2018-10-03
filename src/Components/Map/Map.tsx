import classNames from 'classnames';
import React, { createRef, PureComponent } from 'react';
import { IBaseAsset, ITileAsset, ITokenAsset } from '../../assets';
import Plopper from '../Plopper/Plopper';
import Scenario from '../Scenario/Scenario';
import './Map.css';
import {
  GetAbsCoords,
  IMapDefaultProps,
  IMapProps,
  IMapState,
  ItemPlopped,
  TileMouseEnter,
  TileMouseLeave,
} from './types';

class Map extends PureComponent<IMapProps, IMapState> {
  public static defaultProps: IMapDefaultProps = {
    scenario: {
      connections: [],
      tiles: {},
    }
  };

  public state: Readonly<IMapState> = {
    hoveredTile: { name: '', orientation: 'h', rotation: 0 },
    isAbleToPan: false,
    isPanning: false,
    mapX: 0,
    mapY: 0,
    mouseX: 0,
    mouseY: 0,
    scale: .35,
  };

  private scenario: React.RefObject<Scenario> = createRef();

  public componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  public componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  public render() {
    const { scenario } = this.props;
    const {
      hoveredTile,
      isAbleToPan,
      isPanning,
      mapX,
      mapY,
      mouseX,
      mouseY,
      scale,
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
            scenario={scenario!}
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

  private handleTileMouseEnter: TileMouseEnter = (name, rotation, orientation) => {
    this.setState({ hoveredTile: { name, rotation, orientation } });
  }

  private handleTileMouseLeave: TileMouseLeave = () => {
    this.setState(({ hoveredTile}) => ({
      hoveredTile: { ...hoveredTile, name: '' }
    }));
  }

  private handleMouseDown = () => {
    const { isAbleToPan } = this.state;

    if (isAbleToPan) {
      this.setState({ isPanning: true });
    }
  }

  private handleMouseUp = () => {
    const { isPanning } = this.state;

    if (isPanning) {
      this.setState({ isPanning: false });
    }
  }

  private handleMouseMove = ({ clientX, clientY }: React.MouseEvent) => {
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

  private handleKeyDown = (event: KeyboardEvent) => {
    const { key } = event;

    if (key === ' ') {
      this.setState({ isAbleToPan: true })
    }
  }

  private handleKeyUp = (event: KeyboardEvent) => {
    const { key } = event;

    if (key === ' ') {
      this.setState({ isAbleToPan: false, isPanning: false });
    }
  }

  private handleItemPlopped: ItemPlopped = (item, type, x, y, rotation) => {
    const scenario = this.scenario.current;

    if (!scenario) { throw new ReferenceError('Unable to find scenario reference'); }

    if (type === 'tile') {
      scenario.placeTile(item as ITileAsset, x, y, rotation)
        .then(() => scenario.connectPlacedTileIfPossible(item.id));
    } else if (type === 'monster') {
      scenario.placeMonster(item as IBaseAsset, x, y);
    } else if (type === 'token') {
      const { hoveredTile: { rotation: tileRotation } } = this.state;
      scenario.placeToken(item as ITokenAsset, x, y, rotation - tileRotation);
    }
  }

  private getAbsCoords: GetAbsCoords = (x, y) => {
    const { mapX, mapY, scale } = this.state;

    return {
      x: (x / scale) - (mapX / scale),
      y: (y / scale) - (mapY / scale),
    };
  }
}

export default Map;
