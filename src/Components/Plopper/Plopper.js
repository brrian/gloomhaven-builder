import classNames from 'classnames';
import React, { Component } from 'react';

class Plopper extends Component {
  state = {
    visible: false,
  };

  componentDidMount() {
    document.addEventListener('click', this.handleMouseClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.visible &&
      prevProps.hoveredTile.orientation !== this.props.hoveredTile.orientation
    ) {
      this.correctPlopperRotation();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleMouseClick);
  }

  get src() {
    const { hoveredTile: { orientation } } = this.props;
    const { id, type } = this.state;

    const fileName = type === 'monster' ? `${id}-${orientation}` : id;

    return `images/${type}s/${fileName}.png`;
  }

  handleMouseClick = ({ shiftKey }) => {
    const {
      visible,
      id,
      rotation,
      type
    } = this.state;

    const {
      handleItemPlopped,
      hoveredTile,
      isAbleToPan,
      x,
      y,
    } = this.props;

    if (
      !visible ||
      isAbleToPan ||
      (type !== 'tile' && hoveredTile.name === false)
    ) { return; }

    handleItemPlopped(id, type, x, y, rotation);

    if (type === 'tile' || shiftKey === false) {
      this.setState({ visible: false });
    }
  }

  handleKeyDown = (event) => {
    const { type, visible } = this.state;
    const { key } = event;

    if (key === 'r' && visible && type !== 'monster') {
      event.preventDefault();

      this.setState(({ rotation: prevRotation, type }) => {
        const rotation = type !== 'token' ? 30 : 60;
        return { rotation: prevRotation + rotation };
      });
    } else if (key === 't') {
      event.preventDefault();

      this.setState({
        visible: true,
        type: 'tile',
        id: 'a1a',
        rotation: 0,
      });
    } else if (key === 'm') {
      event.preventDefault();

      this.setState({
        visible: true,
        type: 'monster',
        id: 'stone-golem',
        rotation: 0,
      });
    } else if (key === 'k') {
      event.preventDefault();

      this.setState({
        visible: true,
        type: 'token',
        // id: 'thorns',
        id: 'corridor-earth-2h',
        // id: 'wood-door-closed',
        hexes: 2,
        rotation: this.props.hoveredTile.rotation,
      });
    }
  }

  correctPlopperRotation() {
    const { hoveredTile: { orientation } } = this.props;
    const { rotation: prevRotation } = this.state;

    const rotation = orientation === 'h' ? 30 : -30;

    this.setState({ rotation: prevRotation + rotation });
  }

  render() {
    const { scale, x, y } = this.props;

    const {
      hexes,
      rotation,
      type,
      visible,
    } = this.state;

    const transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;

    return visible ? (
      <div className="plopper-wrapper" style={{ transform }}>
        <img
          className={classNames('plopper', type)}
          src={this.src}
          data-type={type}
          data-hexes={hexes}
          alt=""
        />
      </div>
    ) : false;
  }
}

export default Plopper;
