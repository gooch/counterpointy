$(document).ready(function () {

    function targetIsNotThePoint(event) {
        return {
            'a': true,
            'input': true
        }[event.target.nodeName.toLowerCase()] ||
            $(event.target).hasClass('button');
    }

    function shorthash(hash) {
        return hash.substr(0, 12);
    }

    $('.point').click(function (event) {
        if (targetIsNotThePoint(event)) {
            return;
        }
        var point = $(this).closest('.point');
        document.location = '/' + shorthash(point.data('pointHash'));
    });

    $('.expandable').click(function () {
        $(this).hide().next().show().children('textarea').focus();
        return false;
    });

    $('.expandable').next().hide();

    $('.focus-on-load').focus();

    $('.main-point').click(function (event) {
        if (targetIsNotThePoint(event)) {
            return;
        }
        var editdiv = $('.main-point-edit');
        if (editdiv.length) {
            $(this).hide();
            $('.pstance select').attr('disabled', 'disabled');
            editdiv.show().find('textarea').focus().select();
        }
    });

    $('.main-point-edit .cancel-button').click(function () {
        var text = $('.main-point').data('text');
        $('.main-point-edit textarea').val(text);
        $('.main-point-edit').hide();
        $('.main-point').show();
        $('.pstance select').removeAttr('disabled');
        return false;
    });

    $('.pstance select').change(function () {
        $(this).closest('form').submit();
    });

    $('.point-entry').autocomplete({
        source: '/suggest.json',
        minLength: 3
    });

    $('.upvote, .downvote').click(function () {
        var username = $('body').data('username');
        if (!username) {
            alert('Please log in to vote.');    // FIXME alert sucks
            return;
        }
        /*
        /:conclusion_hash/supporting/:premise_hash
        /:conclusion_hash/opposing/:premise_hash
        */
        var $this = $(this);

        var conclusion_hash = $('.main-point').data('hash');
        var premise_hash = $this.closest('.point').data('pointHash');

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
                location.reload(true);  // FIXME unwanted page load
            }
        });
    });

});
