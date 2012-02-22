$(document).ready(function () {

    var username = $('body').data('username');

    $('.point-navigable a, .point-navigable .button').click(function (event) {
        event.stopPropagation();
    });

    function shorthash(hash) {
        return hash.substr(0, 12);
    }

    $('.point.navigable .point-navigable').click(function (event) {
        var point = $(this).closest('.point');
        document.location = '/' + shorthash(point.data('hash'));
    });

    $('.focus-on-load').focus();

    $('.point.editable .point-text').click(function (event) {
        if (!username) {
            alert('Please log in to edit.');
            return false;
        }
        var point = $(this).closest('.point');
        point.find('.point-view').hide();
        point.find('.point-edit').show().find('textarea').focus().select();
    });

    $('.point-edit .cancel-button').click(function () {
        var point = $(this).closest('.point');
        var text = point.data('text');
        var editor = point.find('.point-edit');
        editor.find('textarea').val(text);
        editor.hide();
        point.find('.point-view').show();
        return false;
    });

    $('.pvote .button').click(function () {
        if (!username) {
            alert('Please log in to vote.');    // FIXME alert sucks
            return;
        }
        var $this = $(this);
        var hash = $this.closest('.point').data('hash')
        if (!hash) {
            throw new Error('confused about hash');
        }
        var val;
        if ($this.hasClass('checked')) {
            val = 'neutral';
        } else if ($this.hasClass('pvote-true')) {
            val = 'true';
        } else if ($this.hasClass('pvote-undecided')) {
            val = 'undecided';
        } else if ($this.hasClass('pvote-false')) {
            val = 'false';
        } else {
            throw new Error('confused about val');
        }
        $.ajax({
            type: 'POST',
            url: '/' + hash + '/pstance',
            data: { stance: val },
            error: function (xhr, textStatus, errorThrown) {
                // FIXME friendly ajax error message
                alert(
                    (textStatus || '') + '\n' +
                    (errorThrown || '') + '\n' +
                    (xhr.statusText || '')
                );
            },
            success: function () {
                var pvote = $this.closest('.pvote');
                pvote.children('.button').removeClass('checked');
                if (val === 'true') {
                    pvote.find('.pvote-true').addClass('checked');
                } else if (val == 'undecided') {
                    pvote.find('.pvote-undecided').addClass('checked');
                } else if (val == 'false') {
                    pvote.find('.pvote-false').addClass('checked');
                }
            }
        });
    });

    $('.point-entry textarea').autocomplete({
        source: '/suggest.json',
        minLength: 3
    });

    $('.point-entry textarea').focus(function () {
        var $this = $(this);
        if (!username) {
            alert('Please log in to contribute.');
            $this.blur();
            return false;
        }
        var entry = $this.closest('.point-entry');
        if (!entry.hasClass('collapsed')) {
            return;
        }
        entry.removeClass('collapsed');
        $this.val('');
        $this.attr('rows', '4');
    });

    $('.upvote, .downvote').click(function () {
        if (!username) {
            alert('Please log in to vote.');    // FIXME alert sucks
            return;
        }
        /*
        /:conclusion_hash/supporting/:premise_hash
        /:conclusion_hash/opposing/:premise_hash
        */
        var $this = $(this);

        var point = $this.closest('.point');
        var premise_hash = point.data('hash');
        var conclusion_hash = point.data('conclusionHash');

        var premiseStance;
        if ($this.closest('.supporting').length) {
            premiseStance = 'supporting';
        } else if ($this.closest('.opposing').length) {
            premiseStance = 'opposing';
        } else {
            throw new Error('confused about premiseStance');
        }

        var vote;
        if ($this.hasClass('checked')) {
            vote = 'none';
        } else if ($this.hasClass('upvote')) {
            vote = 'up';
        } else if ($this.hasClass('downvote')) {
            vote = 'down';
        } else {
            throw new Error('confused about vote');
        }
        $.ajax({
            type: 'POST',
            url: '/' + conclusion_hash + '/' + premiseStance + '/' + premise_hash,
            data: { vote: vote },
            error: function (xhr, textStatus, errorThrown) {
                // FIXME friendly ajax error message
                alert(
                    (textStatus || '') + '\n' +
                    (errorThrown || '') + '\n' +
                    (xhr.statusText || '')
                );
            },
            success: function () {
                var upvote = point.find('.upvote');
                var downvote = point.find('.downvote');
                upvote.removeClass('checked');
                downvote.removeClass('checked');
                point.removeClass('newdownvote');
                if (vote === 'up') {
                    upvote.addClass('checked');
                } else if (vote === 'down') {
                    downvote.addClass('checked');
                    point.addClass('newdownvote');
                }
            }
        });
    });

    $('.downvotesbelow').click(function () {
        var items = $(this).closest('.item').nextAll();
        if (items.is(':hidden')) {
            items.slideDown(100);
        } else {
            items.slideUp(100);
        }
        return false;
    });

});
