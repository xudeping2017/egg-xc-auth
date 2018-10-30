'use strict';

const mock = require('egg-mock');

describe('test/xc-auth.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      baseDir: 'apps/xc-auth-test',
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .expect(200);
  });
});
