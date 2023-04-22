<!-- traditional mustache -->
<script type="text/template" id="template-mustache-traditional-content">
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
            <p class="effect-label" data-i18n="[prepend]app.template.content.effect.label">0</p>
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

<!-- mustache-bridge acceptable -->
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
            <p class="effect-label" data-i18n="[prepend]app.template.content.effect.label">0</p>
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

<!-- stampino-bridge acceptable -->
<template id="template-stampino-bridge-content">
    <header>
        <label>👈</label>
        <button><a href="#" data-i18n="app.common.back">🌐</a></button>
        <h1 data-i18n="app.template.stampino-bridge.title">🌐</h1>
    </header>
    <section>
        <h3 data-i18n="app.template.stampino-bridge.description">🌐</h3>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.state.label">{{ count }}</p>
            <button class="state-reset" @click="{{ handler.stateReset }}" data-i18n="app.template.content.state.button.reset">🌐</button>
            <button class="state-plus" @click="{{ handler.statePlus }}">➕</button>
            <button class="state-minus" @click="{{ handler.stateMinus }}">➖</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p class="effect-label" data-i18n="[prepend]app.template.content.effect.label">0</p>
            <button class="effect" @click="{{ handler.effect }}" data-i18n="app.template.content.effect.button.label">🌐</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.interval.label">{{ now }}</p>
            <button class="interval-start" @click="{{ handler.intervalStart }}" data-i18n="app.template.content.interval.button.start">🌐</button>
            <button class="interval-stop" @click="{{ handler.intervalStop }}" data-i18n="app.template.content.interval.button.stop">🌐</button>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.input.label">{{ text }}</p>
            <input class="input-text" type="text" placeholder="🌐" @input="{{ handler.inputText }}" data-i18n="[placeholder]app.template.content.input.placeholder"/>
        </fieldset>
        <fieldset class="template-control-group">
            <p data-i18n="[prepend]app.template.content.list.label">{{ list.length }}</p>
            <button class="list-reset" @click="{{ handler.listReset }}" data-i18n="app.template.content.list.button.clear">🌐</button>
            <button class="list-plus" @click="{{ handler.listPlus }}">➕</button>
            <button class="list-minus" @click="{{ handler.listMinus }}">➖</button>
            <hr>
            <template type="if" if="{{ list.length }}">
                <table border="1">
                    <tr>
                        <th data-i18n="app.template.content.list.column.id">🌐</th><th data-i18n="app.template.content.list.column.score">🌐</th>
                    </tr>
                    <!-- stampino テンプレートでは配列の要素は `item` にマッピングされる -->
                    <template type="repeat" repeat="{{ list }}">
                        <tr>
                            <td>{{ item.id }}</td><td>{{ item.score }}</td>
                        </tr>
                    </template>
                </table>
            </template>
            <template type="if" if="{{ !list.length }}">
                <p data-i18n="app.template.content.list.noItem">🌐</p>
            </template>
        </fieldset>
    </section>
</template>

<!-- componet-view page body -->
<template id="template-component-view-page-body">
    <header>
        <label>👈</label>
        <button><a href="#" data-i18n="app.common.back">🌐</a></button>
        <h1 data-i18n="app.template.component-view.title">🌐</h1>
    </header>
    <section>
        <h3 data-i18n="app.template.component-view.description">🌐</h3>
        <div class="state-base"></div>
        <div class="effect-base"></div>
        <div class="interval-base"></div>
        <div class="input-base"></div>
        <div class="list-base"></div>
    </section>
</template>

<!-- componet-view state -->
<template id="template-component-view-state">
    <fieldset class="template-control-group">
        <p data-i18n="[prepend]app.template.content.state.label">{{ count }}</p>
        <button class="state-reset" data-i18n="app.template.content.state.button.reset">🌐</button>
        <button class="state-plus">➕</button>
        <button class="state-minus">➖</button>
    </fieldset>
</template>

<!-- componet-view effect -->
<template id="template-component-view-effect">
    <fieldset class="template-control-group">
        <p class="effect-label" data-i18n="[prepend]app.template.content.effect.label">0</p>
        <button class="effect" data-i18n="app.template.content.effect.button.label">🌐</button>
    </fieldset>
</template>

<!-- componet-view interval -->
<template id="template-component-view-interval">
    <fieldset class="template-control-group">
        <p data-i18n="[prepend]app.template.content.interval.label">{{ now }}</p>
        <button class="interval-start" data-i18n="app.template.content.interval.button.start">🌐</button>
        <button class="interval-stop" data-i18n="app.template.content.interval.button.stop">🌐</button>
    </fieldset>
</template>

<!-- componet-view input -->
<template id="template-component-view-input">
    <fieldset class="template-control-group">
        <p class="input-label" data-i18n="[prepend]app.template.content.input.label"></p>
        <input class="input-text" type="text" placeholder="🌐" data-i18n="[placeholder]app.template.content.input.placeholder"/>
        <p data-i18n="app.template.component-view.input.description">🌐</p>
    </fieldset>
</template>

<!-- componet-view list -->
<template id="template-component-view-list">
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
</template>
