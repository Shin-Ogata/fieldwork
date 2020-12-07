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
    <template>
        <div></div>
    </template>
</article>
