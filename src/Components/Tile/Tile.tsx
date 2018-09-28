import classNames from 'classnames';
import React, { createRef, PureComponent } from 'react';
import './Tile.css';

interface TileProps {
  anchors: number[][];
  handleMonsterTypeClick: (tileId: string, pos: number[], party: number) => void;
  handleTileMouseEnter: (tileId: string, rotation: number, tokenOrientation: string) => void;
  handleTileMouseLeave: () => void;
  height: number;
  id: string;
  isHorizontal: boolean;
  monsters: Array<{
    id: string;
    pos: number[];
    type: {
      [key: string]: string;
    };
  }>;
  order: number;
  scale: number;
  startHex: number[];
  rotation: number;
  tokens: Array<{
    canOverlay: boolean;
    hexes: number;
    id: string;
    pos: number[];
    rotation: number;
  }>;
  width: number;
  x: number;
  y: number;
};

interface TileState {
  tokenHeight: number;
  tokenOrientation: string;
  tokenWidth: number;
}

class Tile extends PureComponent<TileProps, TileState> {
  public static defaultProps = {
    monsters: [],
  };

  public anchors: { [key: string]: HTMLDivElement } = {};

  private origin: React.RefObject<HTMLDivElement> = createRef();

  public componentWillMount() {
    this.setTileDimensions();
  }

  public render() {
    const {
      anchors,
      handleMonsterTypeClick,
      handleTileMouseEnter,
      height,
      id: tileId,
      monsters,
      order,
      rotation,
      tokens,
      width,
      x,
      y,
    } = this.props;

    const { tokenOrientation } = this.state;

    return (
      <div
        className="Tile"
        data-tile={tileId}
        onMouseEnter={handleTileMouseEnter.bind(this, tileId, rotation, tokenOrientation)}
        onMouseLeave={this.handleTileMouseLeave}
        style={{
          backgroundImage: `url(images/tiles/${tileId}.png)`,
          height,
          left: x,
          top: y,
          transform: `rotate(${rotation}deg)`,
          width,
          zIndex: 1000 - order,
        }}
      >
        <div ref={this.origin} className="Tile__Origin" />
        {anchors.map(([ left, top ], index) => (
          <div
            ref={el => this.anchors[index] = el as HTMLDivElement}
            key={`${top}${left}`}
            className="Tile__Anchor"
            style={{ top, left }}
          />
        ))}
        {Object.values(monsters).map(({ id: monsterId, pos, type }) => (
          <div
            key={`${pos}`}
            className="Monster"
            style={{
              ...this.getTokenPosition(pos),
              backgroundImage: `url(images/monsters/${monsterId}-${tokenOrientation}.png)`,
              transform: `rotate(-${rotation}deg)`,
            }}
          >
            {[2, 3, 4].map(party => (
              <div
                key={party}
                className={`Monster--${tokenOrientation.toUpperCase()}`}
                data-party={party}
                data-type={type[party]}
                onClick={handleMonsterTypeClick.bind(this, tileId, pos, party)}
              />
            ))}
          </div>
        ))}
        {Object.values(tokens).map(({
          canOverlay = false,
          hexes,
          id: tokenId,
          pos,
          rotation: tokenRotation = 0
        }) => (
          <img
            className={classNames('Token', { isOverlay: canOverlay })}
            data-hexes={hexes}
            key={`${tokenId}${pos}`}
            src={`images/tokens/${tokenId}.png`}
            style={{
              ...this.getTokenPosition(pos),
              transform: `rotate(${tokenRotation}deg)`,
            }}
          />
        ))}
    </div>
    );
  }

  public getHexPosition(mouseX: number, mouseY: number) {
    const {
      height,
      isHorizontal,
      rotation,
      scale,
      startHex,
    } = this.props;

    const { tokenHeight, tokenWidth } = this.state;

    const rads = rotation * (Math.PI / 180);

    const { left: originX, top: originY } = this.origin.current!.getBoundingClientRect();

    const x = ((mouseX - originX) / scale);
    const y = -((mouseY - originY) / scale);

    const left = (x * Math.cos(rads)) - (y * Math.sin(rads));
    const bottom = (x * Math.sin(rads)) + (y * Math.cos(rads));

    let initialRank = bottom - (height - startHex[1]);
    let initialFile = left - startHex[0];

    if (!isHorizontal && Math.round(initialRank / tokenHeight) % 2 === 1) {
      initialFile -= tokenWidth / 2;
    } else if (isHorizontal && Math.round(initialFile / tokenWidth) % 2 === 1) {
      initialRank += tokenHeight / 2;
    }

    const rank = Math.round(initialRank / tokenHeight) + 1;
    const file = Math.round(initialFile / tokenWidth) + 1;

    return [rank, file];
  }

  private handleTileMouseLeave = ({ relatedTarget }: React.MouseEvent) => {
    if (relatedTarget instanceof HTMLElement && relatedTarget.classList.contains('map__wrapper')) {
      this.props.handleTileMouseLeave();
    }
  }

  private getTokenPosition([ rank, file ]: number[]) {
    const { height: tileHeight, isHorizontal, startHex } = this.props;
    const { tokenHeight, tokenWidth } = this.state;

    let left = startHex[0] + ((file - 1) * tokenWidth);
    let bottom = tileHeight - startHex[1] + ((rank - 1) * tokenHeight);

    if (!isHorizontal && rank % 2 === 0) {
      left += tokenWidth / 2;
    } else if (isHorizontal && file % 2 === 0) {
      bottom -= tokenHeight / 2;
    }

    return { left, bottom };
  }

  private setTileDimensions() {
    const { isHorizontal, rotation } = this.props;

    const shouldFlip = [30, 90, 150, 210, 270].includes(rotation);
    let orientation = isHorizontal ? 'h' : 'v';

    if (shouldFlip) {
      orientation = orientation === 'h' ? 'v' : 'h';
    }

    this.setState({
      tokenHeight: !isHorizontal ? 168 : 195,
      tokenOrientation: orientation,
      tokenWidth: !isHorizontal ? 194  : 168,
    });
  }
}

export default Tile;
