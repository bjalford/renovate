import * as httpMock from '../../../test/http-mock';
import { getName } from '../../../test/util';
import { setBaseUrl } from '../../util/http/bitbucket';
import * as comments from './comments';

const baseUrl = 'https://api.bitbucket.org';

describe(getName(), () => {
  const config: comments.CommentsConfig = { repository: 'some/repo' };

  beforeEach(() => {
    jest.clearAllMocks();

    setBaseUrl(baseUrl);
  });

  describe('ensureComment()', () => {
    it('does not throw', async () => {
      expect.assertions(2);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/3/comments?pagelen=100')
        .reply(200);
      expect(
        await comments.ensureComment({
          config,
          number: 3,
          topic: 'topic',
          content: 'content',
        })
      ).toBe(false);
    });

    it('add comment if not found', async () => {
      expect.assertions(2);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/5/comments?pagelen=100')
        .reply(200, { values: [] })
        .post('/2.0/repositories/some/repo/pullrequests/5/comments')
        .reply(200);

      expect(
        await comments.ensureComment({
          config,
          number: 5,
          topic: 'topic',
          content: 'content',
        })
      ).toBe(true);
    });

    it('add updates comment if necessary', async () => {
      expect.assertions(2);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/5/comments?pagelen=100')
        .reply(200, {
          values: [
            {
              id: 5,
              content: { raw: '### some-subject\n\nsome\nobsolete\ncontent' },
            },
          ],
        })
        .put('/2.0/repositories/some/repo/pullrequests/5/comments/5')
        .reply(200);
      const res = await comments.ensureComment({
        config,
        number: 5,
        topic: 'some-subject',
        content: 'some\ncontent',
      });
      expect(res).toBe(true);
    });

    it('skips comment', async () => {
      expect.assertions(2);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/5/comments?pagelen=100')
        .reply(200, {
          values: [
            {
              id: 5,
              content: { raw: 'blablabla' },
            },
          ],
        });
      expect(
        await comments.ensureComment({
          config,
          number: 5,
          topic: null,
          content: 'blablabla',
        })
      ).toBe(true);
    });
  });

  describe('ensureCommentRemoval()', () => {
    it('does not throw', async () => {
      expect.assertions(1);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/5/comments?pagelen=100')
        .reply(200, { values: [] });
      await comments.ensureCommentRemoval(config, 5, 'topic');
    });

    it('deletes comment by topic if found', async () => {
      expect.assertions(1);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/5/comments?pagelen=100')
        .reply(200, {
          values: [
            {
              id: 5,
              content: { raw: '### some-subject\n\nsome-content' },
            },
          ],
        })
        .delete('/2.0/repositories/some/repo/pullrequests/5/comments/5')
        .reply(200);

      await comments.ensureCommentRemoval(config, 5, 'some-subject');
    });

    it('deletes comment by content if found', async () => {
      expect.assertions(1);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/5/comments?pagelen=100')
        .reply(200, {
          values: [
            {
              id: 5,
              content: { raw: '\n\nsome-content\n\n' },
            },
          ],
        })
        .delete('/2.0/repositories/some/repo/pullrequests/5/comments/5')
        .reply(200);

      await comments.ensureCommentRemoval(config, 5, undefined, 'some-content');
    });

    it('deletes nothing', async () => {
      expect.assertions(1);
      httpMock
        .scope(baseUrl)
        .get('/2.0/repositories/some/repo/pullrequests/5/comments?pagelen=100')
        .reply(200, { values: [] });
      await comments.ensureCommentRemoval(config, 5, 'topic');
    });
  });
});
