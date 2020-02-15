import React from 'react';
import {rhythm} from "../utils/typography";
import {Link} from "gatsby";
import {formatPostDate, formatReadingTime} from "../utils/helpers";
import {formatTags} from "./Tags";
import get from "lodash/get";


export default function ArticleDescription({article, langKey}) {
    const title = get(article, 'frontmatter.title') || article.fields.slug;
    return (
        <article key={article.fields.slug}>
            <header>
                <h3
                    style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: rhythm(1),
                        marginBottom: rhythm(1 / 4),
                    }}
                >
                    <Link
                        style={{ boxShadow: 'none' }}
                        to={article.fields.slug}
                        rel="bookmark"
                    >
                        {title}
                    </Link>
                </h3>
                <small>
                    {formatPostDate(article.frontmatter.date, langKey)}
                    {` • `}
                    {formatTags(article.frontmatter.tags)}
                    {` • ${formatReadingTime(article.timeToRead, langKey)}`}
                </small>
            </header>
            <p
                dangerouslySetInnerHTML={{ __html: article.frontmatter.spoiler }}
            />
        </article>

    )
}