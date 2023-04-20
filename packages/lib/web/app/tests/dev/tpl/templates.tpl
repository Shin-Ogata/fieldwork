<template id="subflow-a">
    <div id="page-subflow-a" class="router-page subflow-page" data-theme="normal">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="app.common.back">🌐</a></button>
            <h1 id="page-subflow-a-title" data-i18n="app.subflow.title.pageA:normal">🌐</h1>
        </header>
        <section>
            <h3 id="page-subflow-a-desctiption" data-i18n="app.subflow.description.pageA:normal">🌐</h3>
            <fieldset class="control-group">
                <button id="page-subflow-a-btn-1" data-i18n="app.subflow.button.toPageB:normal">🌐</button>
                <button id="page-subflow-a-btn-2" data-i18n="app.subflow.button.beginSubFlowDestA" data-normal-only="true">🌐</button>
                <button id="page-subflow-a-btn-3" data-i18n="app.subflow.button.beginSubFlowDestB" data-normal-only="true">🌐</button>
                <button id="page-subflow-a-btn-4" data-i18n="app.subflow.button.beginSubFlowDestC" data-normal-only="true">🌐</button>
            </fieldset>
        </section>
    </div>
</template>

<template id="subflow-b">
    <div id="page-subflow-b" class="router-page subflow-page" data-theme="normal">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="app.common.back">🌐</a></button>
            <h1 id="page-subflow-b-title" data-i18n="app.subflow.title.pageB:normal">🌐</h1>
        </header>
        <section>
            <h3 id="page-subflow-b-desctiption" data-i18n="app.subflow.description.pageB:normal">🌐</h3>
            <fieldset class="control-group">
                <button id="page-subflow-b-btn-1" data-i18n="app.subflow.button.beginSubFlowDestA">🌐</button>
                <button id="page-subflow-b-btn-2" data-i18n="app.subflow.button.beginSubFlowDestB" data-normal-only="true">🌐</button>
                <button id="page-subflow-b-btn-3" data-i18n="app.subflow.button.beginSubFlowDestC" data-normal-only="true">🌐</button>
            </fieldset>
        </section>
    </div>
</template>

<script type="text/template" id="subflow-c">
    <div id="page-subflow-c" class="router-page subflow-page" data-theme="normal">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="app.common.back">🌐</a></button>
            <h1 data-i18n="app.subflow.title.pageC">🌐</h1>
        </header>
        <section>
            <h3 data-i18n="app.subflow.description.pageC">🌐</h3>
        </section>
    </div>
</script>

<script type="text/template" id="template-mustache-content">
    <header>
        <label>👈</label>
        <button><a href="#" data-i18n="app.common.back">🌐</a></button>
        <h1 data-i18n="app.template.mustache.title">🌐</h1>
    </header>
    <section>
        <h3 data-i18n="app.template.mustache.description">🌐</h3>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.state.label">{{ count }}</p>
            <button class="state-reset" data-i18n="app.template.content.state.button.reset">🌐</button>
            <button class="state-plus">➕</button>
            <button class="state-minus">➖</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.effect.label">{{ clicked }}</p>
            <button class="effect" data-i18n="app.template.content.effect.button.label">🌐</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.interval.label">{{ now }}</p>
            <button class="interval-start" data-i18n="app.template.content.interval.button.start">🌐</button>
            <button class="interval-stop" data-i18n="app.template.content.interval.button.stop">🌐</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.input.label">{{ text }}</p>
            <input class="input-text" type="text" value="{{ text }}" placeholder="🌐" data-i18n="[placeholder]app.template.content.input.placeholder"/>
            <p data-i18n="app.template.mustache.input.description">🌐</p>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.list.label">{{ list.length }}</p>
            <button class="list-reset" data-i18n="app.template.content.list.button.clear">🌐</button>
            <button class="list-plus">➕</button>
            <button class="list-minus">➖</button>
            <hr>
            {{# list.length }}
            <table border="1">
                <tr>
                    <th data-i18n="app.template.content.list.column.id">🌐</th><th data-i18n="app.template.content.list.column.score">🌐</th>
                </tr>
                <!--
                  Mustache Template doesn't render inside table tbody
                  https://stackoverflow.com/questions/15585819/mustache-template-doesnt-render-inside-table-tbody

                  - mustache 記法はコメントも使用できるので回避可能
                -->
                <!-- {{# list }} -->
                <tr>
                    <td>{{ id }}</td><td>{{ score }}</td>
                </tr>
                <!-- {{/ list }} -->
            </table>
            {{/ list.length }}
            {{^ list.length }}
            <p data-i18n="app.template.content.list.noItem">🌐</p>
            {{/ list.length }}
        </fieldset>
    </section>
</script>

<template id="template-mustache-bridge-content">
    <header>
        <label>👈</label>
        <button><a href="#" data-i18n="app.common.back">🌐</a></button>
        <h1 data-i18n="app.template.mustache-bridge.title">🌐</h1>
    </header>
    <section>
        <h3 data-i18n="app.template.mustache-bridge.description">🌐</h3>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.state.label">{{ count }}</p>
            <button class="state-reset" data-i18n="app.template.content.state.button.reset">🌐</button>
            <button class="state-plus">➕</button>
            <button class="state-minus">➖</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.effect.label">{{ clicked }}</p>
            <button class="effect" data-i18n="app.template.content.effect.button.label">🌐</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.interval.label">{{ now }}</p>
            <button class="interval-start" data-i18n="app.template.content.interval.button.start">🌐</button>
            <button class="interval-stop" data-i18n="app.template.content.interval.button.stop">🌐</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.input.label">{{ text }}</p>
            <input class="input-text" type="text" placeholder="🌐" data-i18n="[placeholder]app.template.content.input.placeholder"/>
            <p data-i18n="app.template.mustache-bridge.input.description">🌐</p>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.list.label">{{ list.length }}</p>
            <button class="list-reset" data-i18n="app.template.content.list.button.clear">🌐</button>
            <button class="list-plus">➕</button>
            <button class="list-minus">➖</button>
            <hr>
            {{# list.length }}
            <table border="1">
                <tr>
                    <th data-i18n="app.template.content.list.column.id">🌐</th><th data-i18n="app.template.content.list.column.score">🌐</th>
                </tr>
                <!-- {{# list }} -->
                <tr>
                    <td>{{ id }}</td><td>{{ score }}</td>
                </tr>
                <!-- {{/ list }} -->
            </table>
            {{/ list.length }}
            {{^ list.length }}
            <p data-i18n="app.template.content.list.noItem">🌐</p>
            {{/ list.length }}
        </fieldset>
    </section>
</template>
