<article>
    <script type="text/template" id="test-mustache">
        <ul>
            {{#families}}
            <li><span class="surname">{{surname}}</span>
                <ul>
                    {{#members}}
                    <li><span class="given">{{given}}</span></li>
                    <li><span class="age">{{&age}}</span></li>
                    {{/members}}
                </ul>
            </li>
            {{/families}}
        </ul>
    </script>
    <template id="test-mustache-template">
        <ul>
            {{#families}}
            <li><span class="surname">{{surname}}</span>
                <ul>
                    {{#members}}
                    <li><span class="given">{{given}}</span></li>
                    <li><span class="age">{{&age}}</span></li>
                    {{/members}}
                </ul>
            </li>
            {{/families}}
        </ul>
    </template>
    <template id="test-stampino-template">
        <div>
            <h2 class="title" data-i18n="test.title">🌐</h2>
            <template type="if" if="{{ important }}">
                <p class="important" data-i18n="test.description">🌐</p>
            </template>
        </div>
        <template type="repeat" repeat="{{ messages }}">
            <p class="message">{{ item.text }}</p>
            <div>
                <template type="if" if="{{ nest }}">
                    <p class="nest" data-i18n="test.nest">🌐</p>
                </template>
            </div>
        </template>
    </template>
</article>
