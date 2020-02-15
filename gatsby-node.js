const _ = require('lodash');
const Promise = require('bluebird');
const path = require('path');
const { createFilePath } = require('gatsby-source-filesystem');
const { supportedLanguages } = require('./i18n');


exports.createPages = ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions;

  return new Promise((resolve, reject) => {
    const blogPost = path.resolve('./src/templates/blog-post.js');
    const blogIndex = path.resolve('./src/templates/blog-index.js');


    // Create index pages for all supported languages
    Object.keys(supportedLanguages).forEach(langKey => {
      createPage({
        path: langKey === 'zh-hans' ? '/' : `/${langKey}/`,
        component: blogIndex,
        context: {
          langKey,
        },
      });
    });

    resolve(
      graphql(
        `
          {
            allMarkdownRemark(
              sort: { fields: [frontmatter___date], order: DESC }
              limit: 1000
            ) {
              edges {
                node {
                  fields {
                    slug
                    langKey
                    directoryName
                    maybeAbsoluteLinks
                  }
                  frontmatter {
                    title
                  }
                }
              }
            }
          }
        `
      ).then(result => {
        if (result.errors) {
          console.log(result.errors);
          reject(result.errors);
          return;
        }

        // Create blog posts pages.
        const posts = result.data.allMarkdownRemark.edges;

        const mdFilesByDirectory = _.reduce(
          posts,
          (result, post) => {
            const directoryName = _.get(post, 'node.fields.directoryName');
            const langKey = _.get(post, 'node.fields.langKey');

            if (directoryName && langKey) {
              (result[directoryName] || (result[directoryName] = [])).push(
                post
              );
            }
            return result;
          },
          {}
        );

        _.forOwn(mdFilesByDirectory, (langPosts, directoryName) => {
          // const previous =
          //   index === defaultLangPosts.length - 1
          //     ? null
          //     : defaultLangPosts[index + 1].node;
          // const next = index === 0 ? null : defaultLangPosts[index - 1].node;

          const translations = _.reduce(
              langPosts,
              (result, post) => {
                result.push(post.node.fields.langKey);
                return result
              },
              []
          );

          _.each(langPosts, (post) => {
            console.log(post.node.fields.slug);
            if (post.node.fields.langKey === 'zh-hans') {
              createPage({
                path: post.node.fields.slug,
                component: blogPost,
                context: {
                  slug: post.node.fields.slug,
                  next: null,
                  previous: null,
                  translations,
                  translatedLinks: [],
                },
              });
            } else {
              createPage({
                path: post.node.fields.slug,
                component: blogPost,
                context: {
                  slug: post.node.fields.slug,
                  translations,
                  translatedLinks: [],
                },
              });
            }
          });



          // const otherLangPosts = posts.filter(
          //   ({ node }) => node.fields.langKey !== 'zh-hans'
          // );
          // _.each(otherLangPosts, post => {
          //   const translations =
          //     translationsByDirectory[_.get(post, 'node.fields.directoryName')];
          //
          //   // Record which links to internal posts have translated versions
          //   // into this language. We'll replace them before rendering HTML.
          //   let translatedLinks = [];
          //   const { langKey, maybeAbsoluteLinks } = post.node.fields;
          //   maybeAbsoluteLinks.forEach(link => {
          //     if (allSlugs.has(link)) {
          //       if (allSlugs.has('/' + langKey + link)) {
          //         // This is legit an internal post link,
          //         // and it has been already translated.
          //         translatedLinks.push(link);
          //       } else if (link.startsWith('/' + langKey + '/')) {
          //         console.log('-----------------');
          //         console.error(
          //           `It looks like "${langKey}" translation of "${
          //             post.node.frontmatter.title
          //           }" ` +
          //             `is linking to a translated link: ${link}. Don't do this. Use the original link. ` +
          //             `The blog post renderer will automatically use a translation if it is available.`
          //         );
          //         console.log('-----------------');
          //       }
          //     }
          //   });
          //
          //   createPage({
          //     path: post.node.fields.slug,
          //     component: blogPost,
          //     context: {
          //       slug: post.node.fields.slug,
          //       translations,
          //       translatedLinks,
          //     },
          //   });
          // });
        });
      })
    );
  });
};

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions;

  if (_.get(node, 'internal.type') === `MarkdownRemark`) {
    createNodeField({
      node,
      name: 'directoryName',
      value: path.basename(path.dirname(_.get(node, 'fileAbsolutePath'))),
    });

    // Capture a list of what looks to be absolute internal links.
    // We'll later remember which of them have translations,
    // and use that to render localized internal links when available.

    // TODO: check against links with no trailing slashes
    // or that already link to translations.
    const markdown = node.internal.content;
    let maybeAbsoluteLinks = [];
    let linkRe = /\]\((\/[^\)]+\/)\)/g;
    let match = linkRe.exec(markdown);
    while (match != null) {
      maybeAbsoluteLinks.push(match[1]);
      match = linkRe.exec(markdown);
    }
    createNodeField({
      node,
      name: 'maybeAbsoluteLinks',
      value: _.uniq(maybeAbsoluteLinks),
    });
  }
};
