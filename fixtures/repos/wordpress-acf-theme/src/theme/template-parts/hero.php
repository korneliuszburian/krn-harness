<?php

$hero_variant = $hero_variant ?? 'classic';
?>
<section class="hero hero--classic" data-hero-section>
    <h1><?php echo esc_html($hero_headline ?? 'Build with clarity'); ?></h1>
    <a class="hero__cta" data-hero-cta href="#contact">Start now</a>
</section>
