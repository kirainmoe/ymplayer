import * as React from 'react';
import { observable, autorun } from 'mobx';
import { observer } from 'mobx-react';

// Containers
import ControlContainer from './ControlContainer';
import SelectorContainer from './SelectorContainer';
import DrawerContainer from './DrawerContainer';
import MenuContainer from './MenuContainer';

// Components
import { Cover, Progress } from '../components';

// Stylus
import '../styles/MUSE.styl';

// Utils
import { applyMiddleware } from '../utils';

interface UIContainerProps {
  id: any;
  store: any;
  accuracy: any;
}

interface UIContainerState {
  currentTime: number;
  duration: number;
}

@observer
export class UIContainer extends React.Component<UIContainerProps, UIContainerState> {

  @observable touchTimer: any = undefined;
  id: string | number = undefined;
  player: HTMLElement;

  unsubscriber: any = undefined;

  constructor(props: UIContainerProps) {
    super(props);
    this.id = props.id;
    this.state = {
      currentTime: 0,
      duration: 0
    };
  }

  /* life cycles */
  componentDidMount() {
    const { store } = this.props,
      instance = {
        component: this,
        ref: this.player,
        id: this.id
      };
    store.pushPlayerInstance(instance, this.id);

    window.addEventListener('resize', this.onWindowResize);

    this.player.addEventListener('contextmenu', this.onPlayerContextMenu);
    this.player.addEventListener('touchstart', this.onMobileTouchStart);
    this.player.addEventListener('touchend', this.onMobileTouchEnd);
    this.player.addEventListener(
      'webkitfullscreenchange',
      this.onFullscreenChange
    );
    this.player.addEventListener(
      'mozfullscreenchange',
      this.onFullscreenChange
    );

    this.unsubscriber = autorun(this.subscriber);
    applyMiddleware('afterRender', instance);
    applyMiddleware('onPlayerResize', instance);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize);

    this.player.removeEventListener('contextmenu', this.onPlayerContextMenu);
    this.player.removeEventListener('touchstart', this.onMobileTouchStart);
    this.player.removeEventListener('touchend', this.onMobileTouchEnd);
    this.player.removeEventListener(
      'webkitfullscreenchange',
      this.onFullscreenChange
    );
    this.player.removeEventListener(
      'mozfullscreenchange',
      this.onFullscreenChange
    );

    this.unsubscriber();
  }

  getFullscreenState = () => {
    return document.fullscreenElement
      ? true
      : document.webkitFullscreenElement
        ? true
        : (document as any).mozFullScreenElement ? true : false;
  };

  /* fullscreen related store subscribers */
  subscriber = () => {
    const eleFSState = this.getFullscreenState(),
      { isFullscreen } = this.props.store,
      { player } = this;

    if (eleFSState !== isFullscreen && isFullscreen) {
      setTimeout(() => {
        const state = player.requestFullscreen
          ? player.requestFullscreen() || true
          : player.webkitRequestFullscreen
            ? player.webkitRequestFullscreen() || true
            : false;
        if (!state && !(player as any).mozRequestFullScreen) {
          console.error('It seems that your browser does not support HTML5 Fullscreen feature.');
        }
      }, 10);
    } else if (eleFSState !== isFullscreen && !isFullscreen) {
      document.exitFullscreen
        ? document.exitFullscreen()
        : document.webkitExitFullscreen
          ? document.webkitExitFullscreen()
          : (document as any).mozCancelFullScreen ? (document as any).mozCancelFullScreen() : () => false;
    } else {
      return;
    }
  };

  /* event listeners */
  onMobileTouchStart = (e: any) => {
    const state = this.props.store;
    if (state.isMenuOpen) {
      return;
    }

    this.touchTimer = setTimeout(() => this.onPlayerContextMenu(e), 1000);
  };

  onMobileTouchEnd = () => {
    clearTimeout(this.touchTimer);
  };

  onPlayerContextMenu = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    this.props.store.toggleMenu(true);

    // set position
    const menuElement: any = this.player.querySelector('.muse-menu');
    if (!e.touches) {
      menuElement.style.top = e.clientY + 'px';
      menuElement.style.left = e.clientX + 'px';
    } else {
      menuElement.style.top = e.touches[0].clientY + 'px';
      menuElement.style.left = e.touches[0].clientX + 'px';
    }

    // register destroy events
    document.body.addEventListener('click', this.destroyPlayerMenu);
  };

  onWindowResize = (e: any) => {
    applyMiddleware('onPlayerResize', this.props.store.playerInstance, e);
  };

  onFullscreenChange = () => {
    const currentState = this.getFullscreenState(),
      storedState = this.props.store.isFullscreen;
    if (currentState !== storedState) {
      this.props.store.toggleFullscreen(currentState);
    }
  };

  destroyPlayerMenu = (e: any) => {
    e.preventDefault();
    this.props.store.toggleMenu(false);
    document.body.removeEventListener('click', this.destroyPlayerMenu);
  };

  render(): JSX.Element {
    const {
      playList,
      currentMusicIndex,
      playerLayout,
      isDrawerOpen
    } = this.props.store,
      { id, store } = this.props,
      cover = playList[currentMusicIndex].cover;

    const className: string =  'muse-player ' + playerLayout +
      (isDrawerOpen ? ' muse-root__state-drawer-open' : '');

    return (
      <div
        id={id}
        className={className}
        ref={ref => (this.player = ref)}
        data-length={playList.length}
      >
        <Cover cover={cover} id={id} />
        <Progress
          currentTime={this.state.currentTime}
          duration={this.state.duration}
          store={store}
          id={id}
        />

        <SelectorContainer parent={this} id={id} store={this.props.store} />
        <MenuContainer store={store} parent={this} id={id} />
        <ControlContainer
          parent={this}
          store={store}
          id={id}
          accuracy={this.props.accuracy}
        />
        <DrawerContainer
          store={store}
          currentTime={this.state.currentTime}
          id={id}
        />
      </div>
    );
  }
}

export default UIContainer;
