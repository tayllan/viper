$(function() {
    var $texto = $('#texto');
    var $ok = $('#ok');
    var $waitingForSentence = $('.waiting-for-sentence');
    var $notWaitingForSentence = $('.not-waiting-for-sentence');
    var $form = $('#dashboard form');
    var record = null;
    var startMarkupHTML1 = '<button class="entity" style="background: ';
    var startMarkupHTML2 = ';">';
    var endMarkupHTML = '</button>';
    var startEntityHTML = '<span class="entity-class">';
    var endEntityHTML = '</span>';
    var labelsColors = {};
    var availableColors = ['#00ffff', '#f0ffff', '#f5f5dc', '#0000ff', '#a52a2a', '#00ffff', '#008b8b', '#a9a9a9', '#bdb76b', '#ff8c00', '#e9967a', '#ff00ff', '#ffd700', '#008000', '#f0e68c', '#add8e6', '#e0ffff', '#90ee90', '#d3d3d3', '#ffb6c1', '#ffffe0', '#00ff00', '#ff00ff', '#ffa500', '#ffc0cb', '#800080', '#ff0000', '#c0c0c0'];

    var replaceAt = function(input, search, replace, start, end) {
        return input.slice(0, start) + input.slice(start, end).replace(search, replace) + input.slice(end);
    }

    var getRandomColor = function() {
        var chosenColorIndex = Math.floor(Math.random() * availableColors.length);
        var chosenColor = availableColors[chosenColorIndex];
        availableColors.splice(chosenColorIndex, 1);

        return chosenColor;
    }

    var updateLabels = function() {
        var text = record.text;

        record.entities
            .map(entity => {
                var classification = entity[2];
                var originalText = entity[3];
                var color = null;

                if (classification in labelsColors) {
                    color = labelsColors[classification];
                } else {
                    color = getRandomColor();
                    labelsColors[classification] = color;
                }

                return {
                    initialPos: entity[0],
                    finalPos: entity[1],
                    originalText: originalText,
                    newTextWithHTML: startMarkupHTML1 + color + startMarkupHTML2 + originalText +
                        startEntityHTML + classification + endEntityHTML + endMarkupHTML
                };
            })
            .sort((a, b) => a.initialPos > b.initialPos ? -1 : 1)
            .forEach(el => text = replaceAt(text, el.originalText, el.newTextWithHTML, el.initialPos, el.finalPos));

        $texto.html(text);
    }

    var next = function() {
        postRecord();

        getRecord();
    };

    var getRecord = function() {
        $.get('/sentence', function(data) {
            record = data;

            if (Object.keys(record).length == 0) {
                $waitingForSentence.show();
                $notWaitingForSentence.hide();
            } else {
                $waitingForSentence.hide();
                $notWaitingForSentence.show();
                updateLabels();
            }
        }).fail(function(err) {
            console.error('Could not retrieve a sentence: ', err);
        });
    };

    var postRecord = function() {
        if (!record) {
            return;
        }

        $ok.addClass('pure-button-disabled');

        var newRecord = {
            entities: record.entities
                .filter(entity => entity.length > 0)
                .map(entity => [entity[0], entity[1], entity[2]]),
            text: record.text
        };
        $.ajax({
            type: 'POST',
            url: '/sentence/save',
            data: {data: JSON.stringify(newRecord)},
            dataType: 'json',
            success: function() {
                $ok.removeClass('pure-button-disabled');
            },
            error: function(err) {
                console.error('Could not save the classified sentence: ', err);
                alert('Failed!');
            }
        });
    }

    $ok.click(function(e) {
        next();
    });

    $texto.mouseup(function(e) {
        var selection = null;
        if (window.getSelection) {
            selection = window.getSelection();
        } else if (document.getSelection) {
            selection = document.getSelection();
        } else if (document.selection) {
            selection = document.selection.createRange().text;
        }
        text = selection.toString().trim();
        if (text) {
            var classification = prompt('What\'s the class of this entity?');
            if (classification) {
                var initialPos = record.text.indexOf(text);
                var finalPos = initialPos + text.length;
                record.entities.push([
                    initialPos,
                    finalPos,
                    classification.toUpperCase(),
                    text
                ]);

                updateLabels();
            }
        }
    });

    $('body').on('click', '.entity', function(e) {
        var element = $(e.currentTarget)[0];
        var originalValue = element.innerHTML.substring(0, element.innerHTML.indexOf(startEntityHTML));
        var index = record.entities.findIndex(entity => entity[3] == originalValue);

        record.entities.splice(index, 1);
        updateLabels();
    });

    $form.submit(function(e) {
        e.preventDefault();

        var $this = $(this);
        var formData = new FormData(this);

        $.ajax({
            url: $this.attr('action'),
            type: 'POST',
            data: formData,
            success: function(data) {
                getRecord();
            },
            error: function(err) {
                console.error('Could not update the model: ', err);
                alert('Failed!');
            },
            cache: false,
            contentType: false,
            processData: false,
        });

        return false;
    })

    // Starting
    getRecord();
});
