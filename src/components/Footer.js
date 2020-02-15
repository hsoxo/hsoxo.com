import React from 'react';

import { rhythm } from '../utils/typography';

class Footer extends React.Component {
  render() {
    return (
      <footer
        style={{
          marginTop: rhythm(2.5),
          paddingTop: rhythm(1),
        }}
      >
        {/*<div style={{ float: 'right' }}>*/}
        {/*  <a href="/rss.xml" target="_blank" rel="noopener noreferrer">*/}
        {/*    rss*/}
        {/*  </a>*/}
        {/*</div>*/}
        <p>
          © 2019 - 2020 HsOXO. Copyright © Hs.<br/>
          Powered by{' '}
          <a
            href="https://www.gatsbyjs.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GatsbyJS
          </a>. Themed by{' '}
          <a
              href="https://github.com/gaearon/overreacted.io"
              target="_blank"
              rel="noopener noreferrer"
          >
            overreacted.io
          </a>.
        </p>
      </footer>
    );
  }
}

export default Footer;
