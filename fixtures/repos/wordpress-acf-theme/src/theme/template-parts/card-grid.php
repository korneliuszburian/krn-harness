<?php

$cards = $cards ?? [];
?>
<section class="card-grid" data-card-grid>
    <?php foreach ($cards as $card) : ?>
        <article class="card-grid__item"><?php echo esc_html($card['title'] ?? ''); ?></article>
    <?php endforeach; ?>
</section>
