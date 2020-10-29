import PropTypes from 'prop-types';
import { Component } from 'react';
import cx from 'clsx';

export default class TabListExt extends Component {
  static defaultProps = {
    className: 'react-tabs__tab-list',
  };

  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    className: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array,
      PropTypes.object,
    ]),
  };

  render() {
    const { title, children, className, ...attributes } = this.props;

    return (
      <div className="react-tabs__title-wrapper">
        <span className="react-tabs__title">{title || ''}</span>
        <ul {...attributes} className={cx(className)} role="tablist">
            {children}
        </ul>
      </div>
    );
  }
}

TabListExt.tabsRole = 'TabList';
